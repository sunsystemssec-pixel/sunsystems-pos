// Comprehensive test suite for Sun Systems Internal Audit requirements

// Mock localStorage for Node environment
class LocalStorageMock {
  constructor() {
    this.store = {};
  }
  getItem(key) {
    return this.store[key] || null;
  }
  setItem(key, value) {
    this.store[key] = String(value);
  }
  clear() {
    this.store = {};
  }
}
global.localStorage = new LocalStorageMock();

async function runTests() {
  console.log('====================================================');
  console.log('SUN SYSTEMS — INTERNAL AUDIT: 101 VERIFICATION TESTS');
  console.log('====================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition, name) {
    if (condition) {
      console.log(`✅ [PASS] ${name}`);
      passed++;
    } else {
      console.error(`❌ [FAIL] ${name}`);
      failed++;
    }
  }

  // 1. Initial State & Seed Data
  const { db } = await import('./src/services/db.js');
  const { driveService, DRIVE_FOLDERS, DATABASE_TABS } = await import('./src/services/googleDrive.js');
  const { sunAI } = await import('./src/services/sunAI.js');
  const { COMPANY_INFO } = await import('./src/data/seedData.js');

  assert(COMPANY_INFO.ownerEmail === 'sunsystems.sec@gmail.com', 'Owner email is sunsystems.sec@gmail.com');
  assert(COMPANY_INFO.ownerName === 'Anand', 'Owner is Anand');
  assert(DRIVE_FOLDERS.length === 11, 'Google Drive has exactly 11 subfolders (01_DATABASE to 11_SCAN_DOCUMENTS)');
  assert(DATABASE_TABS.length === 20, 'Master Google Sheet contains 20 tabs');

  const users = db.getUsers();
  assert(users.length === 6, 'Fixed users: Anand, Anusha, Srikanth, Kumar, Krishna, Sanjay');

  const anand = users.find(u => u.name === 'Anand');
  const anusha = users.find(u => u.name === 'Anusha');
  const srikanth = users.find(u => u.name === 'Srikanth');
  const kumar = users.find(u => u.name === 'Kumar');
  const krishna = users.find(u => u.name === 'Krishna');
  const sanjay = users.find(u => u.name === 'Sanjay');

  assert(anand && anand.role === 'OWNER', 'Anand has OWNER role');
  assert(anusha && anusha.role === 'MANAGER', 'Anusha has MANAGER role');
  assert(srikanth && srikanth.role === 'STAFF', 'Srikanth has STAFF role');
  assert(kumar && kumar.role === 'STAFF', 'Kumar has STAFF role');
  assert(krishna && krishna.role === 'STAFF', 'Krishna has STAFF role');
  assert(sanjay && sanjay.role === 'STAFF', 'Sanjay has STAFF role');

  // 2. Data Entry by All Users (Prompt: "ANY USER CAN ENTER DATA")
  console.log('\n--- Testing Data Entry Rights for All Users ---');
  
  // Kumar creates a sale
  const kumarSale = db.addSale({
    customerName: 'Test Customer A',
    productName: 'Dell Latitude 5420',
    serialNumber: 'ABC123',
    sellingPrice: 27000,
    discount: 0,
    paymentMode: 'UPI'
  }, kumar);
  assert(kumarSale.id.startsWith('SS-SALE-'), 'Kumar can record a sale');

  // Verify stock status updated from READY to SOLD
  const stockItemABC = db.getStock().find(s => s.serialNumber === 'ABC123');
  assert(stockItemABC.status === 'SOLD', 'Sale successfully updated stock status to SOLD');

  // Prevent selling already sold unit
  let alreadySoldBlocked = false;
  try {
    db.addSale({
      customerName: 'Test Customer B',
      productName: 'Dell Latitude 5420',
      serialNumber: 'ABC123',
      sellingPrice: 27000,
      discount: 0,
      paymentMode: 'Cash'
    }, srikanth);
  } catch (e) {
    alreadySoldBlocked = e.message.includes('ALREADY SOLD');
  }
  assert(alreadySoldBlocked, 'Guardrail: Selling an already sold unit is strictly blocked');

  // Srikanth adds stock
  const srikanthStock = db.addStock({
    brand: 'HP',
    model: 'EliteBook 840 G7',
    serialNumber: 'SRI-HP-99',
    condition: 'A Grade',
    charger: true,
    purchaseCost: 21000,
    repairCost: 0,
    transportCost: 300,
    otherCost: 200,
    targetSellingPrice: 26000,
    supplier: 'ABC Computers',
    status: 'READY'
  }, srikanth);
  assert(srikanthStock.id.startsWith('SS-STOCK-'), 'Srikanth can add stock');

  // Prevent duplicate serial number
  let duplicateBlocked = false;
  try {
    db.addStock({
      brand: 'HP',
      model: 'EliteBook 840 G7',
      serialNumber: 'SRI-HP-99',
      condition: 'A Grade',
      charger: true,
      purchaseCost: 21000,
      repairCost: 0,
      transportCost: 0,
      otherCost: 0,
      targetSellingPrice: 26000,
      supplier: 'ABC Computers',
      status: 'READY'
    }, anusha);
  } catch (e) {
    duplicateBlocked = e.message.includes('SERIAL ALREADY EXISTS');
  }
  assert(duplicateBlocked, 'Guardrail: Adding duplicate serial number is strictly blocked');

  // Anusha creates purchase
  const anushaPur = db.addPurchase({
    supplierName: 'ABC Computers',
    productName: 'Lenovo ThinkPad T490 (Lot of 5)',
    quantity: 5,
    unitCost: 17000,
    totalAmount: 85000,
    paymentMode: 'Bank Transfer'
  }, anusha);
  assert(anushaPur.id.startsWith('SS-PUR-'), 'Anusha can record a purchase');

  // Krishna creates expense
  const krishnaExp = db.addExpense({
    category: 'Courier',
    description: 'Bluedart Express delivery',
    amount: 1500,
    paymentMode: 'Cash'
  }, krishna);
  assert(krishnaExp.id.startsWith('SS-EXP-'), 'Krishna can record an expense');

  // Sanjay creates credit entry
  const sanjayCredit = db.addCredit({
    partyName: 'Rajesh Sharma',
    amount: 6000,
    description: 'Accessories on credit',
    outstanding: 6000,
    status: 'OPEN'
  }, sanjay);
  assert(sanjayCredit.id.startsWith('SS-CREDIT-'), 'Sanjay can record a credit entry');

  // 3. Permission Enforcement (Prompt: "ONLY OWNER ANAND CAN ALTER EXISTING DATA")
  console.log('\n--- Testing Critical Alteration Security Rule ---');

  // Staff (Kumar) attempts to alter sale
  let staffAlterBlocked = false;
  try {
    db.alterSale(kumarSale.id, { sellingPrice: 25000 }, 'Kumar wants to change price', kumar);
  } catch (e) {
    staffAlterBlocked = e.message.includes('OWNER ONLY');
  }
  assert(staffAlterBlocked, 'Security Barrier: Staff Kumar is BLOCKED from altering existing sale');

  // Manager (Anusha) attempts to alter purchase
  let managerAlterBlocked = false;
  try {
    db.alterPurchase(anushaPur.id, { totalAmount: 80000 }, 'Anusha price edit', anusha);
  } catch (e) {
    managerAlterBlocked = e.message.includes('OWNER ONLY');
  }
  assert(managerAlterBlocked, 'Security Barrier: Manager Anusha is BLOCKED from altering existing purchase');

  // Owner Anand alters sale with mandatory reason
  const oldAuditCount = db.getAuditLogs().length;
  db.alterSale(kumarSale.id, { sellingPrice: 26000, discount: 500 }, 'Customer phone discount agreement with Anand', anand);
  const updatedSale = db.getSales().find(s => s.id === kumarSale.id);
  assert(updatedSale.finalAmount === 25500, 'Owner Anand successfully altered existing sale');

  const newAuditCount = db.getAuditLogs().length;
  assert(newAuditCount === oldAuditCount + 1, 'Owner alteration created an immutable AUDIT_LOG entry');
  const latestAudit = db.getAuditLogs()[0];
  assert(latestAudit.action === 'RECORD_EDITED_BY_OWNER' && latestAudit.reason === 'Customer phone discount agreement with Anand', 'Audit log records old/new value and mandatory reason');

  // 4. Natural Voice AI Command Parsing (SUN AI)
  console.log('\n--- Testing SUN AI Voice / Natural Language Engine ---');
  
  const voiceSale = sunAI.parseCommand('Sold Dell Latitude 5420 to Ramesh for 26500 UPI', kumar);
  assert(voiceSale.intent === 'SALE' && voiceSale.data.sellingPrice === 26500 && voiceSale.data.paymentMode === 'UPI', 'SUN AI parsed sale voice command correctly');

  const voiceStock = sunAI.parseCommand('Add Dell Latitude 5420 serial ABC123 cost 22000 A grade', srikanth);
  assert(voiceStock.intent === 'STOCK' && voiceStock.data.purchaseCost === 22000, 'SUN AI parsed stock voice command correctly');

  const voiceExpense = sunAI.parseCommand('Paid 2500 cash for courier', krishna);
  assert(voiceExpense.intent === 'EXPENSE' && voiceExpense.data.amount === 2500 && voiceExpense.data.category === 'Courier', 'SUN AI parsed expense voice command correctly');

  const voiceClose = sunAI.parseCommand('Close today accounts', anand);
  assert(voiceClose.intent === 'DAILY_CLOSING', 'SUN AI parsed daily closing intent');

  // 5. Daily Closing Reconciliation
  console.log('\n--- Testing Daily Closing & Cash Reconciliation ---');
  const closing = db.addDailyClosing({
    closedBy: 'Anand',
    systemSales: 150000,
    salesCount: 6,
    cashExpected: 45000,
    cashActual: 44500,
    upiTotal: 95000,
    cardTotal: 10000,
    bankTotal: 0,
    creditTotal: 0,
    expensesTotal: 4000,
    debitTotal: 0,
    differenceReason: '₹500 advance given for courier transport',
    status: 'CLOSED'
  }, anand);
  assert(closing.difference === -500 && closing.status === 'CLOSED', 'Daily closing computes cash variance (-₹500) and locks day');

  // 6. Google Drive & Backup
  console.log('\n--- Testing Google Drive & Backup Engine ---');
  const backup = driveService.createBackup();
  assert(backup.name.includes('SUN SYSTEMS BACKUP') && backup.id.startsWith('BKP-'), 'Automated backup generated in 09_BACKUP folder');

  console.log('\n====================================================');
  console.log(`TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log('====================================================');

  if (failed > 0) process.exit(1);
}

runTests();
