/**
 * Optional off-site SQLite backup to S3-compatible object storage.
 *
 * Recommended (free tier): Cloudflare R2 — https://developers.cloudflare.com/r2/
 *   - ~10 GB storage / month free (more than enough for .db snapshots)
 *   - No egress fee when uploading from Render (you only pay Class A ops; free tier includes millions)
 *
 * Create an R2 bucket + API token (Object Read & Write). Endpoint format:
 *   https://<ACCOUNT_ID>.r2.cloudflarestorage.com
 *
 * Set env vars below; if any required var is missing, remote upload is skipped (local backup unchanged).
 *
 * How many `.db` objects to keep under the prefix (after each upload, oldest are deleted):
 *   BACKUP_REMOTE_MAX_OBJECTS     (preferred — generic for any S3-compatible endpoint)
 *   BACKUP_CLOUDFLARE_MAX_FILES   (alias)
 *   BACKUP_R2_MAX_FILES           (alias)
 * Use `0` on all unset / zero to disable code-side pruning (bucket Lifecycle only).
 */

const fs = require('fs');
const path = require('path');

const status = {
  configured: false,
  lastUploadAt: null,
  lastKey: null,
  lastError: null,
  lastSuccessSize: null
};

let _s3 = null;
let _s3LoadFailed = false;

function _getS3Module() {
  if (_s3LoadFailed) return null;
  try {
    if (!_s3) _s3 = require('@aws-sdk/client-s3');
    return _s3;
  } catch (e) {
    _s3LoadFailed = true;
    console.warn('[backup-remote] Install dependency: npm install @aws-sdk/client-s3');
    return null;
  }
}

function isRemoteBackupConfigured() {
  const ok = !!(
    process.env.BACKUP_S3_ENDPOINT &&
    process.env.BACKUP_S3_BUCKET &&
    process.env.BACKUP_S3_ACCESS_KEY &&
    process.env.BACKUP_S3_SECRET_KEY
  );
  status.configured = ok;
  return ok;
}

function _client() {
  const { S3Client } = _getS3Module();
  if (!S3Client) return null;
  const region = process.env.BACKUP_S3_REGION || 'auto';
  return new S3Client({
    region,
    endpoint: process.env.BACKUP_S3_ENDPOINT.replace(/\/+$/, ''),
    credentials: {
      accessKeyId: process.env.BACKUP_S3_ACCESS_KEY,
      secretAccessKey: process.env.BACKUP_S3_SECRET_KEY
    },
    forcePathStyle: true
  });
}

function _prefix() {
  const p = (process.env.BACKUP_S3_PREFIX || 'leucaena-db').replace(/\/+$/, '') + '/';
  return p;
}

function _maxRemoteObjectsMeta() {
  const candidates = [
    ['BACKUP_REMOTE_MAX_OBJECTS', process.env.BACKUP_REMOTE_MAX_OBJECTS],
    ['BACKUP_CLOUDFLARE_MAX_FILES', process.env.BACKUP_CLOUDFLARE_MAX_FILES],
    ['BACKUP_R2_MAX_FILES', process.env.BACKUP_R2_MAX_FILES]
  ];
  for (const [envKey, raw] of candidates) {
    if (raw == null || String(raw).trim() === '') continue;
    const n = parseInt(raw, 10);
    if (Number.isFinite(n) && n > 0) return { n, envKey };
  }
  return { n: 0, envKey: null };
}

function _maxRemoteObjects() {
  return _maxRemoteObjectsMeta().n;
}

async function _uploadOnce(localPath) {
  const mod = _getS3Module();
  if (!mod) return;
  const { PutObjectCommand, ListObjectsV2Command, DeleteObjectCommand } = mod;
  const client = _client();
  if (!client) return;

  const bucket = process.env.BACKUP_S3_BUCKET;
  const key = _prefix() + path.basename(localPath);
  const body = fs.createReadStream(localPath);

  await client.send(new PutObjectCommand({
    Bucket: bucket,
    Key: key,
    Body: body,
    ContentType: 'application/octet-stream'
  }));

  status.lastUploadAt = new Date().toISOString();
  status.lastKey = key;
  status.lastError = null;
  try {
    status.lastSuccessSize = fs.statSync(localPath).size;
  } catch (e) {
    status.lastSuccessSize = null;
  }

  const maxKeep = _maxRemoteObjects();
  if (maxKeep <= 0) return;

  const listRes = await client.send(new ListObjectsV2Command({
    Bucket: bucket,
    Prefix: _prefix()
  }));
  const contents = (listRes.Contents || []).filter(c => c.Key && /\.db$/i.test(c.Key));
  if (contents.length <= maxKeep) return;

  contents.sort((a, b) => String(b.Key).localeCompare(String(a.Key)));
  const victims = contents.slice(maxKeep);
  for (const obj of victims) {
    await client.send(new DeleteObjectCommand({ Bucket: bucket, Key: obj.Key }));
  }
}

let _chain = Promise.resolve();

/**
 * Queue upload after a successful local snapshot (non-blocking for the caller).
 */
function queueRemoteBackup(localFilePath) {
  if (!isRemoteBackupConfigured()) return;
  if (!fs.existsSync(localFilePath)) return;

  _chain = _chain
    .then(() => _uploadOnce(localFilePath))
    .catch((err) => {
      const msg = (err && err.message) ? String(err.message) : String(err);
      status.lastError = msg;
      console.error('[backup-remote] Upload failed:', msg);
    });
}

function getRemoteBackupStatus() {
  const { n, envKey } = _maxRemoteObjectsMeta();
  return {
    configured: isRemoteBackupConfigured(),
    lastUploadAt: status.lastUploadAt,
    lastKey: status.lastKey,
    lastError: status.lastError,
    lastSuccessBytes: status.lastSuccessSize,
    prefix: isRemoteBackupConfigured() ? _prefix() : null,
    maxRemoteObjects: n,
    /** Which env var supplied `maxRemoteObjects` (null if pruning disabled). */
    maxRemoteObjectsEnv: envKey
  };
}

module.exports = {
  isRemoteBackupConfigured,
  queueRemoteBackup,
  getRemoteBackupStatus
};
