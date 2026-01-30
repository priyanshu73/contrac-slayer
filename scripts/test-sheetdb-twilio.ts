/**
 * Test script to post test data to SheetDB Twilio endpoint
 * 
 * Usage:
 *   npx tsx scripts/test-sheetdb-twilio.ts
 *   or
 *   npm run test:sheetdb
 */

const SHEETDB_URL = process.env.NEXT_PUBLIC_SHEETDB_TWILIO || "https://sheetdb.io/api/v1/ejhcw8b6269qw";

// Test data samples
const testDataSamples = [
  {
    contractor_name: "Test Contractor 1",
    phone_number: "+15551234567",
    state: "CA",
    area_code: "415",
    email: "test1@example.com",
    created_at: new Date().toISOString(),
  },
  {
    contractor_name: "ABC Plumbing Services",
    phone_number: "+12125551234",
    state: "NY",
    area_code: "212",
    email: "contact@abcplumbing.com",
    created_at: new Date().toISOString(),
  },
  {
    contractor_name: "XYZ Landscaping",
    phone_number: "+17325559876",
    state: "IL",
    area_code: "732",
    email: "info@xyzlandscaping.com",
    created_at: new Date().toISOString(),
  },
];

async function postToSheetDB(data: typeof testDataSamples[0]) {
  try {
    console.log(`\n📤 Posting data to SheetDB...`);
    console.log(`URL: ${SHEETDB_URL}`);
    console.log(`Data:`, JSON.stringify(data, null, 2));

    const response = await fetch(SHEETDB_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        data: data,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP ${response.status}: ${errorText}`);
    }

    const result = await response.json();
    console.log(`✅ Success! Response:`, JSON.stringify(result, null, 2));
    return result;
  } catch (error) {
    console.error(`❌ Error posting to SheetDB:`, error);
    throw error;
  }
}

async function runTests() {
  console.log("🧪 SheetDB Twilio Test Script");
  console.log("=" .repeat(50));

  if (!SHEETDB_URL) {
    console.error("❌ NEXT_PUBLIC_SHEETDB_TWILIO environment variable not set!");
    process.exit(1);
  }

  // Test with single entry
  console.log("\n📝 Test 1: Single entry");
  try {
    await postToSheetDB(testDataSamples[0]);
  } catch (error) {
    console.error("Test 1 failed:", error);
  }

  // Uncomment to test multiple entries
  // console.log("\n📝 Test 2: Multiple entries");
  // for (let i = 0; i < testDataSamples.length; i++) {
  //   try {
  //     await postToSheetDB(testDataSamples[i]);
  //     // Wait 1 second between requests to avoid rate limiting
  //     if (i < testDataSamples.length - 1) {
  //       await new Promise(resolve => setTimeout(resolve, 1000));
  //     }
  //   } catch (error) {
  //     console.error(`Test entry ${i + 1} failed:`, error);
  //   }
  // }

  console.log("\n✅ Tests completed!");
}

// Run the tests
runTests().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
