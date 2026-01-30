/**
 * Test script to post test data to SheetDB Twilio endpoint (Node.js version)
 * 
 * Usage:
 *   node scripts/test-sheetdb-twilio.js
 * 
 * NOTE: Make sure your SheetDB spreadsheet has these columns:
 *   - contractor_name
 *   - phone_number
 *   - state
 *   - area_code
 *   - email
 *   - created_at
 */

const SHEETDB_URL = process.env.NEXT_PUBLIC_SHEETDB_TWILIO || "https://sheetdb.io/api/v1/i5j6qm2ul1jdo";

// Test data - must match SheetDB spreadsheet column names
const testData = {
  contractor_name: "Test Contractor - Node.js",
  phone_number: "+15551234567",
  state: "CA",
  area_code: "415",
  email: "test-nodejs@example.com",
  created_at: new Date().toISOString(),
};

async function postToSheetDB() {
  try {
    console.log("🧪 SheetDB Twilio Test Script");
    console.log("=".repeat(50));
    console.log(`\n📤 Posting data to SheetDB...`);
    console.log(`URL: ${SHEETDB_URL}`);
    console.log(`Data:`, JSON.stringify(testData, null, 2));

    // SheetDB format: wrap in data object (as used in the actual code)
    const requestBody = { data: testData };
    
    const response = await fetch(SHEETDB_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`\n⚠️  Error details: ${errorText}`);
      console.error(`\n💡 Make sure your SheetDB spreadsheet has these columns:`);
      console.error(`   - contractor_name`);
      console.error(`   - phone_number`);
      console.error(`   - state`);
      console.error(`   - area_code`);
      console.error(`   - email`);
      console.error(`   - created_at`);
      throw new Error(`HTTP ${response.status}: ${errorText}`);
    }

    const result = await response.json();
    console.log(`\n✅ Success! Response:`, JSON.stringify(result, null, 2));
    return result;
  } catch (error) {
    console.error(`\n❌ Error posting to SheetDB:`, error.message);
    throw error;
  }
}

// Run the test
postToSheetDB()
  .then(() => {
    console.log("\n✅ Test completed successfully!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("\n❌ Test failed:", error);
    process.exit(1);
  });
