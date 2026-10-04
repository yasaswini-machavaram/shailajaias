#!/usr/bin/env bash

# Shailaja IAS - Automated Local to Cloud Migration Script
# Usage: ./scripts/migrate-to-cloud.sh <ATLAS_MONGO_URI> <AWS_S3_BUCKET_NAME> [AWS_REGION]

set -e

ATLAS_URI="$1"
S3_BUCKET="$2"
AWS_REGION="${3:-ap-south-1}"

if [ -z "$ATLAS_URI" ] || [ -z "$S3_BUCKET" ]; then
    echo "❌ Usage: $0 <ATLAS_MONGO_URI> <AWS_S3_BUCKET_NAME> [AWS_REGION]"
    echo "Example: $0 \"mongodb+srv://user:pass@cluster.mongodb.net/shailaja-ias\" \"shailaja-ias-prod-media\" \"ap-south-1\""
    exit 1
fi

echo "=========================================================="
echo "🚀 Starting Shailaja IAS Local -> Cloud Migration"
echo "Target S3 Bucket: $S3_BUCKET ($AWS_REGION)"
echo "Target Database: MongoDB Atlas"
echo "=========================================================="

BACKUP_DIR="./db_backup_$(date +%Y%m%d_%H%M%S)"

# 1. Dump local MongoDB
echo ""
echo "📦 Step 1: Exporting local MongoDB database..."
mongodump --uri="mongodb://localhost:27017/shailaja-ias" --out="$BACKUP_DIR"
echo "✅ Local database exported to $BACKUP_DIR"

# 2. Restore to MongoDB Atlas
echo ""
echo "☁️ Step 2: Restoring data into MongoDB Atlas..."
mongorestore --uri="$ATLAS_URI" "$BACKUP_DIR/shailaja-ias"
echo "✅ MongoDB Atlas restore complete."

# 3. Upload local files to S3
echo ""
echo "📤 Step 3: Uploading local media files (54MB) from apps/api/uploads to S3..."
aws s3 sync apps/api/uploads/ "s3://$S3_BUCKET/uploads/" \
    --region "$AWS_REGION" \
    --cache-control "public, max-age=31536000, immutable"
echo "✅ Media files synced to s3://$S3_BUCKET/uploads/"

# 4. Update Database URLs
echo ""
echo "🔗 Step 4: Updating stored file references in MongoDB Atlas to S3 URLs..."
MONGO_URI="$ATLAS_URI" AWS_BUCKET_NAME="$S3_BUCKET" AWS_REGION="$AWS_REGION" \
    npx tsx scripts/update-db-urls-to-s3.ts

echo ""
echo "=========================================================="
echo "🎉 SUCCESS: All local data and media migrated to Cloud!"
echo "Backup folder preserved at: $BACKUP_DIR"
echo "=========================================================="
