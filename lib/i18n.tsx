"use client";
import { createContext, useContext, useEffect, useState, ReactNode } from "react";

export type Lang = "en" | "ne" | "hi";

// Every UI string lives here once, in all three languages. If a key is missing
// for "ne" or "hi" the English text is shown instead of breaking the page —
// never leave a blank label on screen.
const DICT: Record<string, Record<Lang, string>> = {
  // ---- Nav ----
  dashboard: { en: "Dashboard", ne: "ड्यासबोर्ड", hi: "डैशबोर्ड" },
  billing: { en: "Billing", ne: "बिलिङ", hi: "बिलिंग" },
  medicines: { en: "Medicines", ne: "औषधिहरू", hi: "दवाइयाँ" },
  stock: { en: "Stock", ne: "स्टक", hi: "स्टॉक" },
  purchases: { en: "Purchases", ne: "खरिद", hi: "खरीद" },
  purchaseReturns: { en: "Purchase Returns", ne: "खरिद फिर्ता", hi: "खरीद वापसी" },
  suppliersParty: { en: "Suppliers (Party)", ne: "आपूर्तिकर्ता (पार्टी)", hi: "आपूर्तिकर्ता (पार्टी)" },
  customers: { en: "Customers", ne: "ग्राहकहरू", hi: "ग्राहक" },
  salesHistory: { en: "Sales History", ne: "बिक्री इतिहास", hi: "बिक्री इतिहास" },
  returns: { en: "Returns", ne: "फिर्ता", hi: "वापसी" },
  reports: { en: "Reports", ne: "प्रतिवेदन", hi: "रिपोर्ट" },
  pharmacyProfile: { en: "Pharmacy Profile", ne: "फार्मेसी प्रोफाइल", hi: "फार्मेसी प्रोफ़ाइल" },
  users: { en: "Users", ne: "प्रयोगकर्ताहरू", hi: "उपयोगकर्ता" },
  logout: { en: "Log out", ne: "लगआउट", hi: "लॉग आउट" },
  appTitle: { en: "Pharmacy Management System", ne: "फार्मेसी व्यवस्थापन प्रणाली", hi: "फार्मेसी प्रबंधन प्रणाली" },
  pharmacy: { en: "Pharmacy", ne: "फार्मेसी", hi: "फार्मेसी" },

  // ---- Common actions ----
  add: { en: "Add", ne: "थप्नुहोस्", hi: "जोड़ें" },
  edit: { en: "Edit", ne: "सम्पादन", hi: "संपादित करें" },
  delete: { en: "Delete", ne: "मेटाउनुहोस्", hi: "हटाएं" },
  save: { en: "Save", ne: "सुरक्षित गर्नुहोस्", hi: "सहेजें" },
  cancel: { en: "Cancel", ne: "रद्द गर्नुहोस्", hi: "रद्द करें" },
  search: { en: "Search", ne: "खोज्नुहोस्", hi: "खोजें" },
  print: { en: "Print", ne: "प्रिन्ट", hi: "प्रिंट" },
  close: { en: "Close", ne: "बन्द गर्नुहोस्", hi: "बंद करें" },
  confirm: { en: "Confirm", ne: "पुष्टि गर्नुहोस्", hi: "पुष्टि करें" },
  yes: { en: "Yes", ne: "हो", hi: "हाँ" },
  no: { en: "No", ne: "होइन", hi: "नहीं" },
  actions: { en: "Actions", ne: "कार्यहरू", hi: "कार्रवाई" },
  view: { en: "View", ne: "हेर्नुहोस्", hi: "देखें" },
  loading: { en: "Loading…", ne: "लोड हुँदैछ…", hi: "लोड हो रहा है…" },
  back: { en: "Back", ne: "पछाडि", hi: "वापस" },
  submit: { en: "Submit", ne: "पेश गर्नुहोस्", hi: "सबमिट करें" },

  // ---- Common fields ----
  name: { en: "Name", ne: "नाम", hi: "नाम" },
  fullName: { en: "Full name", ne: "पूरा नाम", hi: "पूरा नाम" },
  phone: { en: "Phone", ne: "फोन", hi: "फ़ोन" },
  address: { en: "Address", ne: "ठेगाना", hi: "पता" },
  email: { en: "Email", ne: "इमेल", hi: "ईमेल" },
  pan: { en: "PAN", ne: "प्यान", hi: "पैन" },
  vatNo: { en: "VAT No.", ne: "भ्याट नं.", hi: "वैट नंबर" },
  date: { en: "Date", ne: "मिति", hi: "तारीख" },
  quantity: { en: "Quantity", ne: "परिमाण", hi: "मात्रा" },
  qty: { en: "Qty", ne: "परि.", hi: "मात्रा" },
  rate: { en: "Rate", ne: "दर", hi: "दर" },
  amount: { en: "Amount", ne: "रकम", hi: "राशि" },
  total: { en: "Total", ne: "जम्मा", hi: "कुल" },
  subtotal: { en: "Subtotal", ne: "उप-जम्मा", hi: "उप-योग" },
  discount: { en: "Discount", ne: "छुट", hi: "छूट" },
  vat: { en: "VAT", ne: "भ्याट", hi: "वैट" },
  paid: { en: "Paid", ne: "तिरेको", hi: "भुगतान किया" },
  due: { en: "Due", ne: "बाँकी", hi: "बकाया" },
  status: { en: "Status", ne: "स्थिति", hi: "स्थिति" },
  cash: { en: "Cash", ne: "नगद", hi: "नकद" },
  credit: { en: "Credit", ne: "उधारो", hi: "उधार" },
  admin: { en: "Admin", ne: "एडमिन", hi: "एडमिन" },
  cashier: { en: "Cashier", ne: "क्यासियर", hi: "कैशियर" },
  role: { en: "Role", ne: "भूमिका", hi: "भूमिका" },
  username: { en: "Username", ne: "प्रयोगकर्ता नाम", hi: "उपयोगकर्ता नाम" },
  password: { en: "Password", ne: "पासवर्ड", hi: "पासवर्ड" },
  invoiceNo: { en: "Invoice No.", ne: "बिल नं.", hi: "चालान संख्या" },
  notes: { en: "Notes", ne: "टिप्पणी", hi: "टिप्पणी" },
  customer: { en: "Customer", ne: "ग्राहक", hi: "ग्राहक" },
  supplier: { en: "Supplier / Party", ne: "आपूर्तिकर्ता / पार्टी", hi: "आपूर्तिकर्ता / पार्टी" },
  walkIn: { en: "Walk-in customer", ne: "वाक-इन ग्राहक", hi: "वॉक-इन ग्राहक" },

  // ---- Login ----
  signIn: { en: "Sign in to continue", ne: "जारी राख्न लगइन गर्नुहोस्", hi: "जारी रखने के लिए साइन इन करें" },
  loginButton: { en: "Sign in", ne: "लगइन गर्नुहोस्", hi: "साइन इन करें" },
  signingIn: { en: "Signing in…", ne: "लगइन हुँदैछ…", hi: "साइन इन हो रहा है…" },
  language: { en: "Language", ne: "भाषा", hi: "भाषा" },

  // ---- Dashboard ----
  todaySales: { en: "Today's Sales", ne: "आजको बिक्री", hi: "आज की बिक्री" },
  monthSales: { en: "This Month's Sales", ne: "यस महिनाको बिक्री", hi: "इस महीने की बिक्री" },
  todayProfit: { en: "Today's Profit", ne: "आजको नाफा", hi: "आज का लाभ" },
  monthProfit: { en: "This Month's Profit", ne: "यस महिनाको नाफा", hi: "इस महीने का लाभ" },
  todayPurchases: { en: "Today's Purchases", ne: "आजको खरिद", hi: "आज की खरीद" },
  monthPurchases: { en: "This Month's Purchases", ne: "यस महिनाको खरिद", hi: "इस महीने की खरीद" },
  totalMedicines: { en: "Total Medicines", ne: "कुल औषधि", hi: "कुल दवाइयाँ" },
  totalStockUnits: { en: "Total Stock Units", ne: "कुल स्टक इकाई", hi: "कुल स्टॉक इकाइयाँ" },
  stockValue: { en: "Stock Value", ne: "स्टक मूल्य", hi: "स्टॉक मूल्य" },
  lowStockItems: { en: "Low Stock Items", ne: "कम स्टक वस्तुहरू", hi: "कम स्टॉक वाली वस्तुएं" },
  expiringSoon: { en: "Expiring Soon", ne: "चाँडै म्याद सकिने", hi: "जल्द समाप्त होने वाला" },
  totalCustomers: { en: "Total Customers", ne: "कुल ग्राहक", hi: "कुल ग्राहक" },
  totalSuppliers: { en: "Total Suppliers", ne: "कुल आपूर्तिकर्ता", hi: "कुल आपूर्तिकर्ता" },
  supplierDue: { en: "Supplier Due (Payable)", ne: "आपूर्तिकर्ता बाँकी (तिर्नुपर्ने)", hi: "आपूर्तिकर्ता बकाया (देय)" },
  customerDue: { en: "Customer Due (Receivable)", ne: "ग्राहक बाँकी (उठाउनुपर्ने)", hi: "ग्राहक बकाया (प्राप्य)" },
  quickActions: { en: "Quick Actions", ne: "द्रुत कार्यहरू", hi: "त्वरित कार्य" },
  newSale: { en: "New Sale", ne: "नयाँ बिक्री", hi: "नई बिक्री" },
  newPurchase: { en: "New Purchase", ne: "नयाँ खरिद", hi: "नई खरीद" },
  newMedicine: { en: "New Medicine", ne: "नयाँ औषधि", hi: "नई दवा" },
  newCustomer: { en: "New Customer", ne: "नयाँ ग्राहक", hi: "नया ग्राहक" },
  newSupplier: { en: "New Supplier", ne: "नयाँ आपूर्तिकर्ता", hi: "नया आपूर्तिकर्ता" },
  todayBills: { en: "Today's Bills", ne: "आजको बिल", hi: "आज के बिल" },
  monthBills: { en: "This Month's Bills", ne: "यस महिनाको बिल", hi: "इस महीने के बिल" },
  today: { en: "Today", ne: "आज", hi: "आज" },
  thisMonth: { en: "This Month", ne: "यो महिना", hi: "इस महीने" },

  // ---- Billing / POS ----
  newSaleBilling: { en: "New Sale / Billing", ne: "नयाँ बिक्री / बिलिङ", hi: "नई बिक्री / बिलिंग" },
  searchMedicineFull: { en: "Search medicine / SKU", ne: "औषधि / SKU खोज्नुहोस्", hi: "दवा / SKU खोजें" },
  completeSale: { en: "Complete Sale", ne: "बिक्री पूरा गर्नुहोस्", hi: "बिक्री पूर्ण करें" },
  amountPaid: { en: "Amount paid", ne: "तिरेको रकम", hi: "भुगतान की गई राशि" },
  change: { en: "Change", ne: "फिर्ता रकम", hi: "वापसी राशि" },
  printLastInvoice: { en: "Print last invoice", ne: "अन्तिम बिल प्रिन्ट गर्नुहोस्", hi: "अंतिम चालान प्रिंट करें" },
  medicine: { en: "Medicine", ne: "औषधि", hi: "दवा" },
  batch: { en: "Batch", ne: "ब्याच", hi: "बैच" },
  customerOptional: { en: "Customer (optional)", ne: "ग्राहक (वैकल्पिक)", hi: "ग्राहक (वैकल्पिक)" },
  amountPaidOptional: { en: "Amount paid (leave blank to pay in full)", ne: "तिरेको रकम (पूरै तिर्न खाली छोड्नुहोस्)", hi: "भुगतान राशि (पूरा भुगतान हेतु खाली छोड़ें)" },
  saleFailed: { en: "Sale failed", ne: "बिक्री असफल भयो", hi: "बिक्री विफल हुई" },
  saleCompleted: { en: "Sale completed", ne: "बिक्री सम्पन्न भयो", hi: "बिक्री पूर्ण हुई" },

  // ---- Medicines ----
  addMedicine: { en: "Add Medicine", ne: "औषधि थप्नुहोस्", hi: "दवा जोड़ें" },
  brandName: { en: "Brand name", ne: "ब्रान्ड नाम", hi: "ब्रांड नाम" },
  sku: { en: "SKU", ne: "SKU", hi: "SKU" },
  batchNumber: { en: "Batch number", ne: "ब्याच नम्बर", hi: "बैच नंबर" },
  expiryDate: { en: "Expiry date", ne: "म्याद सकिने मिति", hi: "समाप्ति तिथि" },
  minStock: { en: "Minimum stock", ne: "न्यूनतम स्टक", hi: "न्यूनतम स्टॉक" },
  purchaseRate: { en: "Purchase rate", ne: "खरिद दर", hi: "खरीद दर" },
  sellingRate: { en: "Selling rate", ne: "बिक्री दर", hi: "बिक्री दर" },
  totalAmount: { en: "Total amount", ne: "कुल रकम", hi: "कुल राशि" },
  fillSampleMedicine: { en: "🎲 Fill Sample Medicine", ne: "🎲 नमूना औषधि भर्नुहोस्", hi: "🎲 नमूना दवा भरें" },
  searchMedicinePlaceholder: { en: "Search by name or SKU", ne: "नाम वा SKU द्वारा खोज्नुहोस्", hi: "नाम या SKU से खोजें" },
  searchMedicineAll: { en: "Search medicine, generic, batch, SKU or barcode", ne: "औषधि, जेनेरिक, ब्याच, SKU वा बारकोड खोज्नुहोस्", hi: "दवा, जेनेरिक, बैच, SKU या बारकोड खोजें" },
  genericName: { en: "Generic name", ne: "जेनेरिक नाम", hi: "जेनेरिक नाम" },
  manufacturer: { en: "Manufacturer", ne: "उत्पादक", hi: "निर्माता" },
  category: { en: "Category", ne: "वर्ग", hi: "श्रेणी" },
  barcode: { en: "Barcode", ne: "बारकोड", hi: "बारकोड" },
  reorderLevel: { en: "Reorder level", ne: "पुन: आदेश स्तर", hi: "पुनः ऑर्डर स्तर" },
  buy: { en: "Buy", ne: "खरिद", hi: "क्रय" },
  sell: { en: "Sell", ne: "बिक्री", hi: "विक्रय" },
  expired: { en: "Expired", ne: "म्याद सकिएको", hi: "समाप्त" },
  lowStock: { en: "Low", ne: "कम", hi: "कम" },
  safe: { en: "Safe", ne: "ठीक", hi: "सुरक्षित" },
  noStock: { en: "No stock", ne: "स्टक छैन", hi: "स्टॉक नहीं" },
  archive: { en: "Archive", ne: "अभिलेख गर्नुहोस्", hi: "आर्काइव करें" },

  // ---- Status / misc ----
  active: { en: "Active", ne: "सक्रिय", hi: "सक्रिय" },
  inactive: { en: "Inactive", ne: "निष्क्रिय", hi: "निष्क्रिय" },
  adjustAction: { en: "Adjust", ne: "समायोजन", hi: "समायोजित करें" },
  resetPassword: { en: "Reset password", ne: "पासवर्ड रिसेट गर्नुहोस्", hi: "पासवर्ड रीसेट करें" },
  makeAdmin: { en: "Make Admin", ne: "एडमिन बनाउनुहोस्", hi: "एडमिन बनाएं" },
  makeCashier: { en: "Make Cashier", ne: "क्यासियर बनाउनुहोस्", hi: "कैशियर बनाएं" },
  invoice: { en: "Invoice", ne: "बिल", hi: "चालान" },
  items: { en: "Items", ne: "वस्तुहरू", hi: "वस्तुएं" },
  payment: { en: "Payment", ne: "भुक्तानी", hi: "भुगतान" },
  cancelled: { en: "cancelled", ne: "रद्द भयो", hi: "रद्द" },
  searchInvoiceOrCustomer: { en: "Search invoice # or customer", ne: "बिल नं. वा ग्राहक खोज्नुहोस्", hi: "चालान नंबर या ग्राहक खोजें" },
  billsCountTotal: { en: "bill(s)", ne: "बिल", hi: "बिल" },
};

const MONTHS: Record<Lang, string[]> = {
  en: ["January","February","March","April","May","June","July","August","September","October","November","December"],
  ne: ["जनवरी","फेब्रुअरी","मार्च","अप्रिल","मे","जुन","जुलाई","अगस्ट","सेप्टेम्बर","अक्टोबर","नोभेम्बर","डिसेम्बर"],
  hi: ["जनवरी","फ़रवरी","मार्च","अप्रैल","मई","जून","जुलाई","अगस्त","सितंबर","अक्टूबर","नवंबर","दिसंबर"],
};

const DEVANAGARI_DIGITS = ["०","१","२","३","४","५","६","७","८","९"];

function toDevanagariDigits(input: string | number): string {
  return String(input).replace(/[0-9]/g, (d) => DEVANAGARI_DIGITS[Number(d)]);
}

type I18nContextValue = {
  lang: Lang;
  setLang: (l: Lang) => void;
  t: (key: string, fallback?: string) => string;
  digits: (value: string | number) => string;
  formatDate: (d: Date | string) => string;
};

const I18nContext = createContext<I18nContextValue | null>(null);

const STORAGE_KEY = "pms_lang";

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>("en");

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY) as Lang | null;
      if (saved === "en" || saved === "ne" || saved === "hi") setLangState(saved);
    } catch {
      /* localStorage unavailable — stay on English */
    }
  }, []);

  function setLang(l: Lang) {
    setLangState(l);
    try {
      localStorage.setItem(STORAGE_KEY, l);
    } catch {
      /* ignore */
    }
  }

  function t(key: string, fallback?: string): string {
    const entry = DICT[key];
    if (!entry) return fallback ?? key;
    return entry[lang] || entry.en || fallback || key;
  }

  function digits(value: string | number): string {
    if (lang === "en") return String(value);
    return toDevanagariDigits(value);
  }

  function formatDate(d: Date | string): string {
    const date = typeof d === "string" ? new Date(d) : d;
    if (lang === "en") return date.toLocaleDateString();
    const day = date.getDate();
    const month = MONTHS[lang][date.getMonth()];
    const year = date.getFullYear();
    return `${digits(day)} ${month} ${digits(year)}`;
  }

  return <I18nContext.Provider value={{ lang, setLang, t, digits, formatDate }}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) {
    // Usable outside the provider too (e.g. during static analysis) — defaults to English.
    return {
      lang: "en" as Lang,
      setLang: () => {},
      t: (key: string, fallback?: string) => fallback ?? key,
      digits: (v: string | number) => String(v),
      formatDate: (d: Date | string) => (typeof d === "string" ? new Date(d) : d).toLocaleDateString(),
    };
  }
  return ctx;
}

export function LanguageSwitcher({ compact = false }: { compact?: boolean }) {
  const { lang, setLang } = useI18n();
  const opts: { code: Lang; label: string }[] = [
    { code: "en", label: "EN" },
    { code: "ne", label: "ने" },
    { code: "hi", label: "हिं" },
  ];
  return (
    <div className={compact ? "langSwitch langSwitchCompact" : "langSwitch"}>
      {opts.map((o) => (
        <button
          key={o.code}
          type="button"
          className={lang === o.code ? "langBtn active" : "langBtn"}
          onClick={() => setLang(o.code)}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
