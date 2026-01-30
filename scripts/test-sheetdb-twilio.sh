#!/bin/bash

# Test script to post test data to SheetDB Twilio endpoint using curl
# 
# Usage:
#   chmod +x scripts/test-sheetdb-twilio.sh
#   ./scripts/test-sheetdb-twilio.sh

SHEETDB_URL="${NEXT_PUBLIC_SHEETDB_TWILIO:-https://sheetdb.io/api/v1/ejhcw8b6269qw}"

echo "🧪 SheetDB Twilio Test Script (curl)"
echo "=================================================="
echo "URL: $SHEETDB_URL"
echo ""

# Test data
TEST_DATA='{
  "data": {
    "contractor_name": "Test Contractor - curl",
    "phone_number": "+15551234567",
    "state": "CA",
    "area_code": "415",
    "email": "test-curl@example.com",
    "created_at": "'$(date -u +"%Y-%m-%dT%H:%M:%S.000Z")'"
  }
}'

echo "📤 Posting test data..."
echo "Data: $TEST_DATA"
echo ""

# Make the POST request
RESPONSE=$(curl -s -w "\nHTTP_STATUS:%{http_code}" \
  -X POST \
  -H "Content-Type: application/json" \
  -d "$TEST_DATA" \
  "$SHEETDB_URL")

# Extract HTTP status code
HTTP_STATUS=$(echo "$RESPONSE" | grep -o "HTTP_STATUS:[0-9]*" | cut -d: -f2)
BODY=$(echo "$RESPONSE" | sed 's/HTTP_STATUS:[0-9]*$//')

echo "Response:"
echo "$BODY" | jq '.' 2>/dev/null || echo "$BODY"
echo ""
echo "HTTP Status: $HTTP_STATUS"

if [ "$HTTP_STATUS" -ge 200 ] && [ "$HTTP_STATUS" -lt 300 ]; then
  echo "✅ Success!"
  exit 0
else
  echo "❌ Failed with HTTP status $HTTP_STATUS"
  exit 1
fi
