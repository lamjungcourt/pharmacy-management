"use client";
import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import NepaliDate from "nepali-date-converter";

export type Lang = "en" | "ne";

// Add new keys here as more pages get translated. Any key missing a "ne" entry
// falls back to English automatically, so partial coverage never breaks the app.
export const DICTIONARY = {
  // Navigation
  dashboard: { en: "Dashboard", ne: "ड्यासबोर्ड" },
  billing: { en: "Billing", ne: "बिलिङ" },
  medicines: { en: "Medicines", ne: "औषधिहरू" },
  stock: { en: "Stock", ne: "स्टक" },
  purchases: { en: "Purchases", ne: "खरिद" },
  purchaseReturns: { en: "Purchase Returns", ne: "खरिद फिर्ता" },
  suppliers: { en: "Suppliers (Party)", ne: "आपूर्तिकर्ता (पार्टी)" },
  customers: { en: "Customers", ne: "ग्राहकहरू" },
  salesHistory: { en: "Sales History", ne: "बिक्री इतिहास" },
  returns: { en: "Returns", ne: "फिर्ता" },
  reports: { en: "Reports", ne: "प्रतिवेदन" },
  pharmacyProfile: { en: "Pharmacy Profile", ne: "फार्मेसी प्रोफाइल" },
  users: { en: "Users", ne: "प्रयोगकर्ताहरू" },
  pharmacyBrand: { en: "Pharmacy", ne: "फार्मेसी" },

  // App shell
  pharmacyManagementSystem: { en: "Pharmacy Management System", ne: "फार्मेसी व्यवस्थापन प्रणाली" },
  admin: { en: "Admin", ne: "एडमिन" },
  cashierRole: { en: "Cashier", ne: "क्यासियर" },
  logout: { en: "Logout", ne: "लगआउट" },

  // Login
  signInToContinue: { en: "Sign in to continue", ne: "जारी राख्न साइन इन गर्नुहोस्" },
  username: { en: "Username", ne: "प्रयोगकर्ता नाम" },
  password: { en: "Password", ne: "पासवर्ड" },
  signIn: { en: "Sign in", ne: "साइन इन" },
  signingIn: { en: "Signing in…", ne: "साइन इन हुँदैछ…" },
  defaultAdminHint: { en: "Default admin", ne: "पूर्वनिर्धारित एडमिन" },
  changeAfterFirstLogin: { en: "change after first login", ne: "पहिलो लगइन पछि परिवर्तन गर्नुहोस्" },

  // Dashboard
  todaysSales: { en: "Today's Sales", ne: "आजको बिक्री" },
  thisMonthsSales: { en: "This Month's Sales", ne: "यस महिनाको बिक्री" },
  todaysBills: { en: "Today's Bills", ne: "आजका बिलहरू" },
  thisMonthsBills: { en: "This Month's Bills", ne: "यस महिनाका बिलहरू" },
  todaysProfit: { en: "Today's Profit", ne: "आजको नाफा" },
  thisMonthsProfit: { en: "This Month's Profit", ne: "यस महिनाको नाफा" },
  todaysPurchases: { en: "Today's Purchases", ne: "आजको खरिद" },
  thisMonthsPurchases: { en: "This Month's Purchases", ne: "यस महिनाको खरिद" },
  totalMedicines: { en: "Total Medicines", ne: "जम्मा औषधिहरू" },
  totalStock: { en: "Total Stock", ne: "जम्मा स्टक" },
  lowStock: { en: "Low Stock", ne: "न्यून स्टक" },
  expired: { en: "Expired", ne: "म्याद सकिएको" },
  expiringSoon: { en: "Expiring Soon", ne: "चाँडै म्याद सकिने" },
  dueToSuppliers: { en: "Due to Suppliers", ne: "आपूर्तिकर्तालाई तिर्नुपर्ने" },
  dueFromCustomers: { en: "Due from Customers", ne: "ग्राहकबाट पाउनुपर्ने" },
  viewLabel: { en: "View:", ne: "हेर्नुहोस्:" },
  daily: { en: "Daily", ne: "दैनिक" },
  monthly: { en: "Monthly", ne: "मासिक" },
  yearly: { en: "Yearly", ne: "वार्षिक" },
  stockOverview: { en: "Stock Overview", ne: "स्टक विवरण" },
  totalStockUnits: { en: "Total stock units", ne: "जम्मा स्टक इकाई" },
  stockValue: { en: "Stock value", ne: "स्टक मूल्य" },
  quickLinks: { en: "Quick links", ne: "द्रुत लिङ्कहरू" },
  newSale: { en: "New Sale", ne: "नयाँ बिक्री" },
  newPurchase: { en: "New Purchase", ne: "नयाँ खरिद" },
  newMedicine: { en: "New Medicine", ne: "नयाँ औषधि" },
  loading: { en: "Loading…", ne: "लोड हुँदैछ…" },

  // Billing
  newSaleBilling: { en: "New Sale / Billing", ne: "नयाँ बिक्री / बिलिङ" },
  searchMedicineSku: { en: "Search medicine / SKU", ne: "औषधि / SKU खोज्नुहोस्" },
  medicine: { en: "Medicine", ne: "औषधि" },
  batch: { en: "Batch", ne: "ब्याच" },
  qty: { en: "Qty", ne: "परिमाण" },
  rate: { en: "Rate", ne: "दर" },
  amount: { en: "Amount", ne: "रकम" },
  customerOptional: { en: "Customer (optional)", ne: "ग्राहक (वैकल्पिक)" },
  walkInCustomer: { en: "Walk-in customer", ne: "वाक-इन ग्राहक" },
  subtotal: { en: "Subtotal", ne: "जम्मा" },
  discount: { en: "Discount", ne: "छुट" },
  vat: { en: "VAT", ne: "भ्याट" },
  total: { en: "Total", ne: "कुल जम्मा" },
  amountPaidHint: { en: "Amount paid (leave blank to pay in full)", ne: "तिरेको रकम (पूरै तिर्न खाली छोड्नुहोस्)" },
  completeSale: { en: "Complete Sale", ne: "बिक्री पूरा गर्नुहोस्" },
  printLastInvoice: { en: "Print last invoice", ne: "अन्तिम बिल प्रिन्ट गर्नुहोस्" },
  creditDueWithCustomerSuffix: { en: "will be added as credit (udhaar) due for this customer.", ne: "यस ग्राहकको लागि क्रेडिट (उधारो) बक्यौताको रूपमा थपिनेछ।" },
  creditDueNoCustomerPrefix: { en: "Select a customer to record the remaining", ne: "बाँकी रकम क्रेडिट (उधारो) को रूपमा दर्ता गर्न ग्राहक छान्नुहोस्" },
  creditDueNoCustomerSuffix: { en: "as credit (udhaar).", ne: "।" },
  saleCompleted: { en: "Sale completed", ne: "बिक्री पूरा भयो" },
  saleFailed: { en: "Sale failed", ne: "बिक्री असफल भयो" },
  addPatient: { en: "+ Add new patient", ne: "+ नयाँ बिरामी थप्नुहोस्" },
  patientName: { en: "Patient name", ne: "बिरामीको नाम" },
  couldNotAddPatient: { en: "Could not add patient", ne: "बिरामी थप्न सकिएन" },

  // Common actions / words
  add: { en: "Add", ne: "थप्नुहोस्" },
  edit: { en: "Edit", ne: "सम्पादन" },
  delete: { en: "Delete", ne: "मेटाउनुहोस्" },
  save: { en: "Save", ne: "सुरक्षित गर्नुहोस्" },
  cancel: { en: "Cancel", ne: "रद्द गर्नुहोस्" },
  search: { en: "Search", ne: "खोज्नुहोस्" },
  name: { en: "Name", ne: "नाम" },
  phone: { en: "Phone", ne: "फोन" },
  address: { en: "Address", ne: "ठेगाना" },
  actions: { en: "Actions", ne: "कार्यहरू" },
  status: { en: "Status", ne: "स्थिति" },
  sku: { en: "SKU", ne: "SKU" },
  type: { en: "Type", ne: "प्रकार" },
  buyRate: { en: "Buy Rate", ne: "किन्ने दर" },
  mrp: { en: "MRP", ne: "एमआरपी" },
  quantity: { en: "Quantity", ne: "परिमाण" },
  minStock: { en: "Min Stock", ne: "न्यूनतम स्टक" },
  safe: { en: "🟢 Safe", ne: "🟢 सुरक्षित" },
  low: { en: "⚠️ Low", ne: "⚠️ न्यून" },
  expiredStatus: { en: "🔴 Expired", ne: "🔴 म्याद सकिएको" },

  // Medicines page
  addMedicine: { en: "Add Medicine", ne: "औषधि थप्नुहोस्" },
  fillSampleMedicine: { en: "🎲 Fill Sample Medicine", ne: "🎲 नमूना औषधि भर्नुहोस्" },
  searchMedicineFull: { en: "Search medicine, generic, batch or SKU", ne: "औषधि, ब्याच वा SKU खोज्नुहोस्" },
  unitType: { en: "Unit Type", ne: "इकाई प्रकार" },
  expiryDate: { en: "Expiry Date", ne: "म्याद सकिने मिति" },
  couldNotAddMedicine: { en: "Could not add medicine.", ne: "औषधि थप्न सकिएन।" },
  couldNotDeleteMedicine: { en: "Could not delete medicine.", ne: "औषधि मेटाउन सकिएन।" },
  confirmDeleteMedicine: { en: "Delete this medicine and all its batches? This cannot be undone.", ne: "यो औषधि र यसका सबै ब्याचहरू मेटाउने? यो फिर्ता गर्न सकिँदैन।" },
  brandName: { en: "Brand Name", ne: "ब्रान्ड नाम" },
  genericName: { en: "Generic Name", ne: "जेनेरिक नाम" },
  freeQuantity: { en: "Free Quantity", ne: "फ्री परिमाण" },
  totalAmount: { en: "Total Amount", ne: "जम्मा रकम" },

  // Purchases page
  purchasesTitle: { en: "Purchases", ne: "खरिद" },
  vendorParty: { en: "Vendor (Party)", ne: "आपूर्तिकर्ता (पार्टी)" },
  noneOption: { en: "— None —", ne: "— कुनै छैन —" },
  addNewVendor: { en: "+ Add new vendor", ne: "+ नयाँ आपूर्तिकर्ता थप्नुहोस्" },
  newVendorName: { en: "New vendor name", ne: "नयाँ आपूर्तिकर्ताको नाम" },
  paymentType: { en: "Payment Type", ne: "भुक्तानी प्रकार" },
  cashPaidInFull: { en: "Cash (paid in full now)", ne: "नगद (अहिले पूरै तिरेको)" },
  creditPayLater: { en: "Credit (pay vendor later)", ne: "क्रेडिट (पछि तिर्ने)" },
  amountPaidNowOptional: { en: "Amount paid now (optional, 0 if none)", ne: "अहिले तिरेको रकम (वैकल्पिक, केही नभए ०)" },
  fillSampleLine: { en: "🎲 Fill Sample Line", ne: "🎲 नमूना लाइन भर्नुहोस्" },
  batchNo: { en: "Batch #", ne: "ब्याच नं" },
  billTotal: { en: "Bill total", ne: "बिल जम्मा" },
  paidNow: { en: "Paid now", ne: "अहिले तिरेको" },
  willAddToVendorDue: { en: "Will add to Vendor due", ne: "आपूर्तिकर्ताको बक्यौतामा थपिनेछ" },
  selectVendorToTrackDue: { en: "Select a vendor to track due", ne: "बक्यौता ट्र्याक गर्न आपूर्तिकर्ता छान्नुहोस्" },
  recordPurchase: { en: "Record Purchase", ne: "खरिद दर्ता गर्नुहोस्" },
  purchasesStockIn: { en: "Purchases (Stock In)", ne: "खरिद (स्टक इन)" },
  recordAPurchase: { en: "Record a purchase", ne: "खरिद दर्ता गर्नुहोस्" },
  selectEllipsis: { en: "Select…", ne: "छान्नुहोस्…" },
  addLine: { en: "+ Add line", ne: "+ लाइन थप्नुहोस्" },
  savePurchase: { en: "Save Purchase", ne: "खरिद सुरक्षित गर्नुहोस्" },
  recentPurchases: { en: "Recent purchases", ne: "हालैका खरिदहरू" },
  dateCol: { en: "Date", ne: "मिति" },
  itemsCol: { en: "Items", ne: "वस्तुहरू" },
  supplierPartyCol: { en: "Supplier (Party)", ne: "आपूर्तिकर्ता (पार्टी)" },
  paidCol: { en: "Paid", ne: "तिरेको" },
  dueCol: { en: "Due", ne: "बक्यौता" },
  noMedicinesYet: { en: "No medicines yet — add one on the Medicines page first (it has a 🎲 Fill Sample Medicine button too).", ne: "अहिलेसम्म कुनै औषधि छैन — पहिले औषधि पृष्ठमा एउटा थप्नुहोस् (त्यहाँ 🎲 नमूना औषधि भर्ने बटन पनि छ)।" },
  addAtLeastOneLine: { en: "Add at least one complete line item", ne: "कम्तिमा एउटा पूरा लाइन वस्तु थप्नुहोस्" },
  selectVendorForCredit: { en: "Select or add a vendor to record a credit purchase", ne: "क्रेडिट खरिद दर्ता गर्न आपूर्तिकर्ता छान्नुहोस् वा थप्नुहोस्" },
  couldNotAddVendor: { en: "Could not add vendor", ne: "आपूर्तिकर्ता थप्न सकिएन" },
  purchaseFailed: { en: "Purchase failed", ne: "खरिद असफल भयो" },
  purchaseRecorded: { en: "✅ Purchase recorded and stock updated", ne: "✅ खरिद दर्ता भयो र स्टक अद्यावधिक भयो" },
  productName: { en: "Product Name", ne: "उत्पादनको नाम" },
  netTotal: { en: "Net Total", ne: "खुद जम्मा" },

  // Stock page (adjust dialogs)
  searchMedicineSkuBatch: { en: "Search medicine, SKU or batch", ne: "औषधि, SKU वा ब्याच खोज्नुहोस्" },
  adjustAction: { en: "Adjust", ne: "समायोजन" },
  adjustmentFailed: { en: "Adjustment failed", ne: "समायोजन असफल भयो" },
  adjustStockForPrefix: { en: "Adjust stock for", ne: "स्टक समायोजन गर्नुहोस्" },
  currentQtyLabel: { en: "Current qty", ne: "हालको परिमाण" },
  enterChangeHint: { en: "Enter change (e.g. -5 or 10)", ne: "परिवर्तन राख्नुहोस् (उदाहरण: -5 वा 10)" },
  reasonForAdjustment: { en: "Reason for adjustment (optional)", ne: "समायोजनको कारण (वैकल्पिक)" },

  // Reports page
  salesReport: { en: "Sales Report", ne: "बिक्री प्रतिवेदन" },
  purchaseReport: { en: "Purchase Report", ne: "खरिद प्रतिवेदन" },
  bills: { en: "Bills", ne: "बिलहरू" },
  revenue: { en: "Revenue", ne: "आम्दानी" },
  profit: { en: "Profit", ne: "नाफा" },
  discounts: { en: "Discounts", ne: "छुटहरू" },
  purchasesLabel: { en: "Purchases", ne: "खरिदहरू" },
  purchaseAmount: { en: "Purchase Amount", ne: "खरिद रकम" },
  cashPaidLabel: { en: "Cash Paid", ne: "तिरेको नगद" },
  purchaseReturnsLabel: { en: "Purchase Returns", ne: "खरिद फिर्ता" },
  topSellingMedicines: { en: "Top selling medicines", ne: "सबैभन्दा बढी बिक्री हुने औषधिहरू" },
  noSalesInPeriod: { en: "No sales in this period.", ne: "यस अवधिमा कुनै बिक्री भएन।" },
  noPurchasesInPeriod: { en: "No purchases in this period.", ne: "यस अवधिमा कुनै खरिद भएन।" },
  amountDueToSuppliers: { en: "📥 Amount Due to Suppliers (Party)", ne: "📥 आपूर्तिकर्तालाई तिर्नुपर्ने रकम (पार्टी)" },
  amountDueFromCustomers: { en: "📤 Amount Due from Customers", ne: "📤 ग्राहकबाट पाउनुपर्ने रकम" },
  noOutstandingDues: { en: "No outstanding dues.", ne: "कुनै बक्यौता छैन।" },
  lowStockSection: { en: "⚠️ Low stock", ne: "⚠️ न्यून स्टक" },
  expiredExpiringSoonSection: { en: "🔴 Expired / 🟠 Expiring soon", ne: "🔴 म्याद सकिएको / 🟠 चाँडै म्याद सकिने" },
  minCol: { en: "Min", ne: "न्यून" },
  soonStatus: { en: "🟠 Soon", ne: "🟠 चाँडै" },
  billsWord: { en: "bills", ne: "बिलहरू" },
  paidWord: { en: "paid", ne: "तिरेको" },
  dueWord: { en: "due", ne: "बक्यौता" },
  unitsWord: { en: "units", ne: "इकाई" },
  supplierCol: { en: "Supplier", ne: "आपूर्तिकर्ता" },
  customerCol: { en: "Customer", ne: "ग्राहक" },

  // Settings / Pharmacy Profile page (messages)
  pleaseChooseImage: { en: "Please choose an image file (PNG, JPG, WEBP or SVG).", ne: "कृपया एउटा तस्बिर फाइल छान्नुहोस् (PNG, JPG, WEBP वा SVG)।" },
  logoTooLargePrefix: { en: "Logo image is too large. Please choose one under", ne: "लोगो तस्बिर धेरै ठूलो छ। कृपया यो भन्दा सानो छान्नुहोस्" },
  couldNotReadImage: { en: "Could not read that image, please try another file.", ne: "त्यो तस्बिर पढ्न सकिएन, कृपया अर्को फाइल प्रयास गर्नुहोस्।" },
  pharmacyNameRequired: { en: "Pharmacy name is required.", ne: "फार्मेसीको नाम आवश्यक छ।" },
  couldNotSaveProfile: { en: "Could not save profile", ne: "प्रोफाइल सुरक्षित गर्न सकिएन" },
  profileSavedSuccessfully: { en: "Profile saved successfully.", ne: "प्रोफाइल सफलतापूर्वक सुरक्षित भयो।" },
  loadingProfile: { en: "Loading profile…", ne: "प्रोफाइल लोड हुँदैछ…" },
  myPharmacy: { en: "My Pharmacy", ne: "मेरो फार्मेसी" },
  addPanVatBelow: { en: "Add your PAN/VAT number below", ne: "तल आफ्नो प्यान/भ्याट नम्बर थप्नुहोस्" },
  changeLogo: { en: "Change Logo", ne: "लोगो परिवर्तन गर्नुहोस्" },
  uploadLogo: { en: "Upload Logo", ne: "लोगो अपलोड गर्नुहोस्" },
  removeLogo: { en: "Remove Logo", ne: "लोगो हटाउनुहोस्" },
  panVatNumberLabel: { en: "PAN / VAT Number", ne: "प्यान / भ्याट नम्बर" },
  registrationNoHint: { en: "Pharmacy license / registration number", ne: "फार्मेसी इजाजतपत्र / दर्ता नम्बर" },
  emailLabel: { en: "Email", ne: "इमेल" },
  streetCity: { en: "Street, City", ne: "सडक, शहर" },
  allowExpiredMedicines: { en: "Allow expired medicines to be sold", ne: "म्याद सकिएको औषधि बेच्न अनुमति दिनुहोस्" },
  savingEllipsis: { en: "Saving…", ne: "सुरक्षित हुँदैछ…" },
  saveProfile: { en: "Save Profile", ne: "प्रोफाइल सुरक्षित गर्नुहोस्" },

  // Users page
  usersAndRoles: { en: "Users & Roles", ne: "प्रयोगकर्ता र भूमिकाहरू" },
  addUser: { en: "Add user", ne: "प्रयोगकर्ता थप्नुहोस्" },
  fullName: { en: "Full name", ne: "पूरा नाम" },
  addUserBtn: { en: "Add User", ne: "प्रयोगकर्ता थप्नुहोस्" },
  couldNotCreateUser: { en: "Could not create user", ne: "प्रयोगकर्ता सिर्जना गर्न सकिएन" },
  couldNotDeleteUser: { en: "Could not delete user", ne: "प्रयोगकर्ता मेटाउन सकिएन" },
  newPasswordPrompt: { en: "New password for", ne: "नयाँ पासवर्ड यसका लागि" },
  passwordUpdatedFor: { en: "Password updated for", ne: "पासवर्ड अद्यावधिक भयो यसका लागि" },
  confirmDeleteUser: { en: "Delete user", ne: "प्रयोगकर्ता मेटाउने" },
  cannotBeUndone: { en: "This cannot be undone.", ne: "यो फिर्ता गर्न सकिँदैन।" },
  adminPermanentDemote: { en: "Admin accounts are permanent and cannot be demoted", ne: "एडमिन खाताहरू स्थायी हुन् र घटाउन सकिँदैन" },
  adminPermanentDelete: { en: "Admin accounts are permanent and cannot be deleted", ne: "एडमिन खाताहरू स्थायी हुन् र मेटाउन सकिँदैन" },
  usernameCol: { en: "Username", ne: "प्रयोगकर्ता नाम" },

  // Customers / Suppliers pages
  totalDueFromCustomers: { en: "Total Due from Customers", ne: "ग्राहकबाट पाउनुपर्ने जम्मा" },
  totalDueToSuppliers: { en: "Total Due to Suppliers", ne: "आपूर्तिकर्तालाई तिर्नुपर्ने जम्मा" },
  searchByNameOrPhone: { en: "Search by name or phone", ne: "नाम वा फोनबाट खोज्नुहोस्" },
  panVatCol: { en: "PAN/VAT", ne: "प्यान/भ्याट" },
  openingCashDue: { en: "Opening cash due (Rs.), if any", ne: "सुरुको बाँकी नगद (रु.), भए" },
  addCustomerBtn: { en: "Add Customer", ne: "ग्राहक थप्नुहोस्" },
  addSupplierBtn: { en: "Add Supplier", ne: "आपूर्तिकर्ता थप्नुहोस्" },
  dueBaki: { en: "Due (Baki)", ne: "बक्यौता (बाँकी)" },
  advanceLabel: { en: "Advance", ne: "पेश्की" },
  recordPayment: { en: "Record Payment", ne: "भुक्तानी दर्ता गर्नुहोस्" },
  couldNotAddCustomer: { en: "Could not add customer", ne: "ग्राहक थप्न सकिएन" },
  couldNotAddSupplier: { en: "Could not add supplier", ne: "आपूर्तिकर्ता थप्न सकिएन" },
  confirmDeleteCustomer: { en: "Delete this customer?", ne: "यो ग्राहक मेटाउने?" },
  confirmDeleteSupplier: { en: "Delete this supplier?", ne: "यो आपूर्तिकर्ता मेटाउने?" },
  cashReceivedFrom: { en: "Cash received from", ne: "बाट प्राप्त नगद" },
  cashPaidTo: { en: "Cash paid to", ne: "लाई तिरेको नगद" },
  currentDueParen: { en: "current due", ne: "हालको बक्यौता" },
  paymentFailed: { en: "Payment failed", ne: "भुक्तानी असफल भयो" },
  recordedReceivedFrom: { en: "Recorded", ne: "दर्ता भयो" },
  receivedFromSuffix: { en: "received from", ne: "बाट प्राप्त" },
  paidToSuffix: { en: "paid to", ne: "लाई तिरियो" },
  companyLabel: { en: "Company", ne: "कम्पनी" },
  searchByNameOrCompany: { en: "Search by name or company", ne: "नाम वा कम्पनीबाट खोज्नुहोस्" },
  creditLabel: { en: "Credit", ne: "क्रेडिट" },
  payBtn: { en: "Pay", ne: "तिर्नुहोस्" },
  cashReceiptNo: { en: "Cash receipt no.", ne: "नगद रसिद नं." },
  partyReceipts: { en: "Party Receipts", ne: "पार्टी रसिदहरू" },
  partyName: { en: "Party Name", ne: "पार्टीको नाम" },

  // Sales history / Returns / Purchase Returns
  searchInvoiceOrCustomer: { en: "Search invoice # or customer", ne: "बिल नं वा ग्राहक खोज्नुहोस्" },
  billsWordCount: { en: "bill(s)", ne: "बिल(हरू)" },
  cancelledSuffix: { en: "(cancelled)", ne: "(रद्द गरिएको)" },
  paymentCol: { en: "Payment", ne: "भुक्तानी" },
  itemsColShort: { en: "Items", ne: "वस्तुहरू" },

  // Returns page
  processAReturn: { en: "Process a return", ne: "फिर्ता प्रक्रिया गर्नुहोस्" },
  invoiceNumberPlaceholder: { en: "Invoice number, e.g. INV-00001", ne: "बिल नम्बर, जस्तै INV-00001" },
  findInvoice: { en: "Find invoice", ne: "बिल खोज्नुहोस्" },
  invoiceNotFound: { en: "Invoice not found", ne: "बिल फेला परेन" },
  soldQty: { en: "Sold qty", ne: "बेचेको परिमाण" },
  returnQty: { en: "Return qty", ne: "फिर्ता परिमाण" },
  reasonOptional: { en: "Reason (optional)", ne: "कारण (वैकल्पिक)" },
  processReturn: { en: "Process Return", ne: "फिर्ता प्रक्रिया गर्नुहोस्" },
  enterReturnQtyForOne: { en: "Enter a return quantity for at least one item", ne: "कम्तिमा एउटा वस्तुको लागि फिर्ता परिमाण राख्नुहोस्" },
  returnFailed: { en: "Return failed", ne: "फिर्ता असफल भयो" },
  returnProcessed: { en: "✅ Return processed and stock restored", ne: "✅ फिर्ता प्रक्रिया भयो र स्टक पुनर्स्थापित भयो" },
  recentReturns: { en: "Recent returns", ne: "हालैका फिर्ताहरू" },
  reasonCol: { en: "Reason", ne: "कारण" },

  // Purchase Returns page
  purchaseReturnsToSupplier: { en: "Purchase Returns (to Supplier)", ne: "खरिद फिर्ता (आपूर्तिकर्तालाई)" },
  returnStockToSupplier: { en: "Return stock to supplier", ne: "आपूर्तिकर्तालाई स्टक फिर्ता गर्नुहोस्" },
  supplierOptionalFilter: { en: "Supplier (Party) — optional filter", ne: "आपूर्तिकर्ता (पार्टी) — वैकल्पिक फिल्टर" },
  anyOption: { en: "— Any —", ne: "— कुनै पनि —" },
  reasonPlaceholderExample: { en: "e.g. Damaged, wrong item, near expiry", ne: "जस्तै: बिग्रिएको, गलत वस्तु, म्याद नजिक" },
  availableCol: { en: "Available", ne: "उपलब्ध" },
  returnQtyCol: { en: "Return Qty", ne: "फिर्ता परिमाण" },
  saveReturn: { en: "Save Return", ne: "फिर्ता सुरक्षित गर्नुहोस्" },
  addAtLeastOneItemReturn: { en: "Add at least one item to return", ne: "फिर्ता गर्न कम्तिमा एउटा वस्तु थप्नुहोस्" },
  returnRecordedSupplier: { en: "✅ Return recorded, stock reduced, and supplier due adjusted", ne: "✅ फिर्ता दर्ता भयो, स्टक घट्यो, र आपूर्तिकर्ताको बक्यौता समायोजन भयो" },
  recentPurchaseReturns: { en: "Recent purchase returns", ne: "हालैका खरिद फिर्ताहरू" },

  // Stock page
  stockTitle: { en: "Stock", ne: "स्टक" },
  allStock: { en: "All", ne: "सबै" },
  lowStockFilter: { en: "Low Stock", ne: "न्यून स्टक" },
  expiredFilter: { en: "Expired", ne: "म्याद सकिएको" },
  expiringSoonFilter: { en: "Expiring Soon", ne: "चाँडै म्याद सकिने" },

  // Reports page
  reportsTitle: { en: "Reports", ne: "प्रतिवेदन" },
  from: { en: "From", ne: "देखि" },
  to: { en: "To", ne: "सम्म" },
  apply: { en: "Apply", ne: "लागू गर्नुहोस्" },
  dailySales: { en: "Daily sales", ne: "दैनिक बिक्री" },
  monthlySales: { en: "Monthly sales", ne: "मासिक बिक्री" },
  yearlySales: { en: "Yearly sales", ne: "वार्षिक बिक्री" },
  dailyPurchases: { en: "Daily purchases", ne: "दैनिक खरिद" },
  monthlyPurchases: { en: "Monthly purchases", ne: "मासिक खरिद" },
  yearlyPurchases: { en: "Yearly purchases", ne: "वार्षिक खरिद" },

  // Settings / Pharmacy Profile page
  pharmacyProfileTitle: { en: "Pharmacy Profile", ne: "फार्मेसी प्रोफाइल" },
  pharmacyName: { en: "Pharmacy Name", ne: "फार्मेसीको नाम" },
  panVatNo: { en: "PAN/VAT No.", ne: "प्यान/भ्याट नं" },
  registrationNo: { en: "Registration No.", ne: "दर्ता नं" },
  chargeVat: { en: "Charge VAT on sales", ne: "बिक्रीमा भ्याट लगाउने" },
  vatOptionalHint: { en: "optional — leave unchecked for no VAT", ne: "वैकल्पिक — भ्याट नचाहिए अनचेक छोड्नुहोस्" },
  vatRatePercent: { en: "VAT Rate (%)", ne: "भ्याट दर (%)" },
  saveSettings: { en: "Save", ne: "सुरक्षित गर्नुहोस्" },

  // Users page
  usersTitle: { en: "Users", ne: "प्रयोगकर्ताहरू" },
  role: { en: "Role", ne: "भूमिका" },
  makeAdmin: { en: "Make Admin", ne: "एडमिन बनाउनुहोस्" },
  makeCashier: { en: "Make Cashier", ne: "क्यासियर बनाउनुहोस्" },
  resetPassword: { en: "Reset password", ne: "पासवर्ड रिसेट गर्नुहोस्" },

  // Customers / Suppliers
  customersTitle: { en: "Customers", ne: "ग्राहकहरू" },
  suppliersTitle: { en: "Suppliers (Party)", ne: "आपूर्तिकर्ता (पार्टी)" },
  dueAmount: { en: "Due", ne: "बक्यौता" },

  // Sales History / Returns
  salesHistoryTitle: { en: "Sales History", ne: "बिक्री इतिहास" },
  returnsTitle: { en: "Returns", ne: "फिर्ता" },
  purchaseReturnsTitle: { en: "Purchase Returns", ne: "खरिद फिर्ता" },
  invoiceNoCol: { en: "Invoice No", ne: "बिल नं" },
  viewPrint: { en: "View / Print", ne: "हेर्नुहोस् / प्रिन्ट" },

  // Print invoice
  invoice: { en: "Invoice", ne: "बिल" },
  invoiceNoLabel: { en: "No", ne: "नं" },
  dateLabel: { en: "Date", ne: "मिति" },
  cashierLabel: { en: "Cashier", ne: "क्यासियर" },
  customerLabel: { en: "Customer", ne: "ग्राहक" },
  expiry: { en: "Expiry", ne: "म्याद" },
  paidLabel: { en: "Paid", ne: "तिरेको" },
  changeLabel: { en: "Change", ne: "फिर्ता" },
  thankYouNote: { en: "Thank you for your purchase. Please retain this receipt.", ne: "तपाईंको खरिदको लागि धन्यवाद। कृपया यो रसिद सुरक्षित राख्नुहोस्।" },
  print: { en: "Print", ne: "प्रिन्ट" },
  close: { en: "Close", ne: "बन्द गर्नुहोस्" },
  tel: { en: "Tel", ne: "फोन" },
  email: { en: "Email", ne: "इमेल" },
  regNoLabel: { en: "Reg. No", ne: "दर्ता नं" },

  // Permissions / access control
  accessDenied: { en: "Access denied", ne: "पहुँच अस्वीकृत" },
  noPermissionPage: { en: "You don't have permission to open this page.", ne: "तपाईंलाई यो पृष्ठ खोल्न अनुमति छैन।" },
  askAdminForAccess: { en: "If you think you should have access, ask your Administrator to enable it for your account.", ne: "यदि तपाईंले पहुँच पाउनुपर्ने हो भने आफ्नो एडमिनलाई तपाईंको खातामा सक्रिय गर्न अनुरोध गर्नुहोस्।" },
  goToAllowedPage: { en: "Go to a page you can access", ne: "तपाईंले पहुँच पाउने पृष्ठमा जानुहोस्" },
  noModulesEnabled: { en: "Your account has no modules enabled yet. Please contact your Administrator.", ne: "तपाईंको खातामा अझै कुनै मोड्युल सक्रिय गरिएको छैन। कृपया आफ्नो एडमिनलाई सम्पर्क गर्नुहोस्।" },
  permissions: { en: "Permissions", ne: "अनुमतिहरू" },
  permissionsFor: { en: "Permissions for", ne: "अनुमतिहरू:" },
  permissionsHint: { en: "Tick what this user may do. \"View\" is needed to open a page; Add/Edit/Delete automatically include View.", ne: "यो प्रयोगकर्ताले के गर्न सक्छ चिन्ह लगाउनुहोस्। पृष्ठ खोल्न \"हेर्ने\" चाहिन्छ; थप्ने/सम्पादन/मेटाउने ले स्वतः \"हेर्ने\" समावेश गर्छ।" },
  moduleCol: { en: "Module", ne: "मोड्युल" },
  permView: { en: "View", ne: "हेर्ने" },
  permAdd: { en: "Add", ne: "थप्ने" },
  permEdit: { en: "Edit", ne: "सम्पादन" },
  permDelete: { en: "Delete", ne: "मेटाउने" },
  profitAccess: { en: "Profit & financial information", ne: "नाफा तथा वित्तीय जानकारी" },
  profitAccessHint: { en: "Daily / monthly / yearly profit, profit in Reports, and buy-rate (cost) data. Admin-only unless you tick this.", ne: "दैनिक / मासिक / वार्षिक नाफा, प्रतिवेदनमा नाफा, र खरिद दर (लागत) डेटा। यहाँ चिन्ह नलगाएसम्म एडमिन मात्र।" },
  adminOnlyLock: { en: "🔒 Admin only by default", ne: "🔒 पूर्वनिर्धारित रूपमा एडमिन मात्र" },
  allowProfitView: { en: "Allow this user to see profit", ne: "यो प्रयोगकर्तालाई नाफा हेर्न दिनुहोस्" },
  presetDefault: { en: "Default cashier", ne: "पूर्वनिर्धारित क्यासियर" },
  presetAllNoProfit: { en: "Everything except profit", ne: "नाफा बाहेक सबै" },
  presetClear: { en: "Clear all", ne: "सबै हटाउनुहोस्" },
  savePermissions: { en: "Save permissions", ne: "अनुमतिहरू सुरक्षित गर्नुहोस्" },
  permissionsSaved: { en: "Permissions saved for", ne: "अनुमतिहरू सुरक्षित गरियो:" },
  couldNotSavePermissions: { en: "Could not save permissions", ne: "अनुमतिहरू सुरक्षित गर्न सकिएन" },
  adminFullAccess: { en: "Admin — full access", ne: "एडमिन — पूर्ण पहुँच" },
  thisYearsSales: { en: "This Year's Sales", ne: "यस वर्षको बिक्री" },
  thisYearsBills: { en: "This Year's Bills", ne: "यस वर्षका बिलहरू" },
  thisYearsProfit: { en: "This Year's Profit", ne: "यस वर्षको नाफा" },
  thisYearsPurchases: { en: "This Year's Purchases", ne: "यस वर्षको खरिद" },
  confirmMakeAdmin: { en: "Make this user an Admin? Admins get full access (including profit) and can never be demoted or deleted.", ne: "यो प्रयोगकर्तालाई एडमिन बनाउने? एडमिनले नाफा सहित पूर्ण पहुँच पाउँछ र कहिल्यै घटुवा वा मेटाउन सकिँदैन।" },
  accessCol: { en: "Access", ne: "पहुँच" },
  fullAccess: { en: "Full access", ne: "पूर्ण पहुँच" },
  modulesWord: { en: "modules", ne: "मोड्युलहरू" },
  profitSummary: { en: "Profit summary", ne: "नाफाको सारांश" },
  profitSummaryNote: { en: "Visible to Admin and to users the Admin has allowed.", ne: "एडमिन र एडमिनले अनुमति दिएका प्रयोगकर्ताहरूलाई मात्र देखिन्छ।" },
} as const;

export type DictKey = keyof typeof DICTIONARY;

const NEPALI_DIGITS = ["०", "१", "२", "३", "४", "५", "६", "७", "८", "९"];
const BS_MONTHS = ["बैशाख", "जेठ", "असार", "श्रावण", "भदौ", "आश्विन", "कार्तिक", "मंसिर", "पुष", "माघ", "फागुन", "चैत"];

export function toNepaliDigits(input: number | string): string {
  return String(input).replace(/[0-9]/g, (d) => NEPALI_DIGITS[Number(d)]);
}

type Ctx = {
  lang: Lang;
  setLang: (l: Lang) => void;
  t: (key: DictKey) => string;
  digits: (n: number | string) => string;
  formatDate: (d: Date | string, withTime?: boolean) => string;
};

const LanguageContext = createContext<Ctx | null>(null);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>("en");

  useEffect(() => {
    const saved = typeof window !== "undefined" ? localStorage.getItem("pms_lang") : null;
    if (saved === "en" || saved === "ne") setLangState(saved);
  }, []);

  function setLang(l: Lang) {
    setLangState(l);
    if (typeof window !== "undefined") localStorage.setItem("pms_lang", l);
  }

  function t(key: DictKey): string {
    const entry = DICTIONARY[key];
    return entry ? entry[lang] : String(key);
  }

  function digits(n: number | string): string {
    return lang === "ne" ? toNepaliDigits(n) : String(n);
  }

  function formatDate(d: Date | string, withTime = false): string {
    const jsDate = typeof d === "string" ? new Date(d) : d;
    if (lang === "en") {
      return withTime ? jsDate.toLocaleString() : jsDate.toLocaleDateString();
    }
    try {
      const nd = new NepaliDate(jsDate);
      const bs = nd.getBS();
      const dateStr = `${toNepaliDigits(bs.date)} ${BS_MONTHS[bs.month]} ${toNepaliDigits(bs.year)}`;
      return withTime ? `${dateStr}, ${toNepaliDigits(jsDate.toLocaleTimeString())}` : dateStr;
    } catch {
      return jsDate.toLocaleDateString();
    }
  }

  return (
    <LanguageContext.Provider value={{ lang, setLang, t, digits, formatDate }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage(): Ctx {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error("useLanguage() must be used inside <LanguageProvider>");
  return ctx;
}
