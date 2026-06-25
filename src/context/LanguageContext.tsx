import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

export type Lang = "th" | "en" | "zh";

export const LANGUAGES: { code: Lang; name: string; native: string; flag: string }[] = [
  { code: "th", name: "ไทย", native: "ภาษาไทย", flag: "🇹🇭" },
  { code: "en", name: "English", native: "อังกฤษ", flag: "🇬🇧" },
  { code: "zh", name: "中文", native: "จีน", flag: "🇨🇳" },
];

// UI strings (settings cluster + common). Mirrors the 3 languages the web supports.
const STRINGS: Record<Lang, Record<string, string>> = {
  th: {
    settings: "ตั้งค่า",
    set_notifications: "การแจ้งเตือน",
    set_notifications_sub: "จัดการการแจ้งเตือนที่ต้องการรับ",
    set_help: "ศูนย์ช่วยเหลือ",
    set_help_sub: "คำถามที่พบบ่อยเกี่ยวกับการใช้งาน",
    set_report: "รายงานปัญหา",
    set_report_sub: "แจ้งปัญหาการใช้งานให้ทีมงาน",
    set_language: "ภาษา",
    set_language_sub: "เลือกภาษาที่ใช้ในแอป",
    set_privacy: "นโยบายความเป็นส่วนตัว",
    set_privacy_sub: "การเก็บและใช้ข้อมูลส่วนบุคคล",
    set_terms: "เงื่อนไขการใช้งาน",
    set_terms_sub: "ข้อตกลงในการใช้แอปและบริการ",
    set_appinfo: "เกี่ยวกับแอปพลิเคชัน",
    set_appinfo_sub: "เวอร์ชันและข้อมูลแอป",
    set_about: "เกี่ยวกับเรา",
    set_about_sub: "รู้จัก METAHERB มากขึ้น",
    set_security: "ความปลอดภัย",
    set_security_sub: "ตั้งรหัส PIN สำหรับการชำระเงิน",
    set_payment: "การชำระเงิน",
    set_payment_sub: "บัญชีธนาคารและกระเป๋าเงินที่ผูกไว้",
    grp_general: "ทั่วไป",
    grp_payment: "การชำระเงิน",
    grp_support: "ช่วยเหลือและสนับสนุน",
    grp_about: "ข้อมูลแอป",
    set_version: "เวอร์ชัน",
    lang_title: "ภาษา",
    lang_choose: "เลือกภาษาที่ต้องการใช้งาน",
    lang_note: "ระบบจะจดจำภาษาที่เลือกไว้สำหรับการใช้งานครั้งถัดไป",
  },
  en: {
    settings: "Settings",
    set_notifications: "Notifications",
    set_notifications_sub: "Manage the alerts you receive",
    set_help: "Help Center",
    set_help_sub: "Frequently asked questions",
    set_report: "Report a Problem",
    set_report_sub: "Tell our team about an issue",
    set_language: "Language",
    set_language_sub: "Choose the app language",
    set_privacy: "Privacy Policy",
    set_privacy_sub: "How we collect and use your data",
    set_terms: "Terms of Service",
    set_terms_sub: "Terms for using the app & services",
    set_appinfo: "About the App",
    set_appinfo_sub: "Version and app information",
    set_about: "About Us",
    set_about_sub: "Get to know METAHERB",
    set_security: "Security",
    set_security_sub: "Set a PIN for payments",
    set_payment: "Payment",
    set_payment_sub: "Linked bank accounts & wallets",
    grp_general: "General",
    grp_payment: "Payment",
    grp_support: "Help & Support",
    grp_about: "About",
    set_version: "Version",
    lang_title: "Language",
    lang_choose: "Choose your preferred language",
    lang_note: "Your choice is remembered for next time.",
  },
  zh: {
    settings: "设置",
    set_notifications: "通知",
    set_notifications_sub: "管理您接收的提醒",
    set_help: "帮助中心",
    set_help_sub: "常见使用问题",
    set_report: "报告问题",
    set_report_sub: "向团队反馈使用问题",
    set_language: "语言",
    set_language_sub: "选择应用语言",
    set_privacy: "隐私政策",
    set_privacy_sub: "我们如何收集和使用您的数据",
    set_terms: "使用条款",
    set_terms_sub: "使用应用与服务的条款",
    set_appinfo: "关于应用",
    set_appinfo_sub: "版本与应用信息",
    set_about: "关于我们",
    set_about_sub: "了解 METAHERB",
    set_security: "安全",
    set_security_sub: "设置支付 PIN 码",
    set_payment: "支付",
    set_payment_sub: "已绑定的银行账户和钱包",
    grp_general: "通用",
    grp_payment: "支付",
    grp_support: "帮助与支持",
    grp_about: "关于",
    set_version: "版本",
    lang_title: "语言",
    lang_choose: "请选择您偏好的语言",
    lang_note: "系统会记住您的选择以便下次使用。",
  },
};

const STORAGE_KEY = "metaherb.lang";

type LanguageContextValue = {
  lang: Lang;
  setLang: (l: Lang) => void;
  t: (key: string) => string;
};

const LanguageContext = createContext<LanguageContextValue | undefined>(undefined);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>("th");

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((v) => {
      if (v === "th" || v === "en" || v === "zh") setLangState(v);
    });
  }, []);

  const setLang = (l: Lang) => {
    setLangState(l);
    AsyncStorage.setItem(STORAGE_KEY, l).catch(() => {});
  };

  const t = (key: string) => STRINGS[lang][key] ?? STRINGS.th[key] ?? key;

  return <LanguageContext.Provider value={{ lang, setLang, t }}>{children}</LanguageContext.Provider>;
}

export function useLang() {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error("useLang must be used within LanguageProvider");
  return ctx;
}
