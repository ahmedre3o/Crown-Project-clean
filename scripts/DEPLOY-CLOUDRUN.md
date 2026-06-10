# Deploy Backend (crown-api) to Cloud Run من master

تشغيل من **Cloud Shell** بعد استنساخ الريبو في `~/workspace/Crown-Project-clean`.

## الطريقة 1: سكربت واحد

```bash
cd ~/workspace/Crown-Project-clean
bash scripts/deploy-backend-cloudrun.sh
```

## الطريقة 2: أوامر يدوية (نسخ ولصق)

```bash
cd ~/workspace/Crown-Project-clean
git fetch origin
git checkout master
git reset --hard origin/master
git clean -fd
git status
git log -1 --oneline
SHA=$(git rev-parse HEAD); echo "SHA=$SHA"

# عدم عمل commit لـ backend/.env
git checkout -- backend/.env || true

# قائمة الخدمات (اختياري)
gcloud run services list --region us-central1 --project gen-lang-client-0711622878

# Deploy مع label بالـ SHA
gcloud run deploy crown-api \
  --source backend \
  --region us-central1 \
  --project gen-lang-client-0711622878 \
  --labels "git_sha=$SHA,git_branch=master" \
  --quiet

# التأكد أن الـ revision عليه نفس SHA
REV=$(gcloud run services describe crown-api --region us-central1 --project gen-lang-client-0711622878 --format="value(status.latestReadyRevisionName)")
echo "REV=$REV"
gcloud run revisions describe "$REV" --region us-central1 --project gen-lang-client-0711622878 --format="value(metadata.labels.git_sha,metadata.labels.git_branch)"

# URL واختبار health
URL=$(gcloud run services describe crown-api --region us-central1 --project gen-lang-client-0711622878 --format="value(status.url)")
echo "$URL"
curl -i "$URL/api/health"
```

## النتيجة المطلوبة

- Deploy ناجح
- `metadata.labels.git_sha` = نفس قيمة `git rev-parse HEAD`
- `GET /api/health` يرجع **200**
