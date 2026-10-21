"use client";
import { createContext, useContext } from "react";
import type { NavItem } from "@/config/navigation";
import { siteConfig } from "@/config/site";
type Contact = {
  name?: string;
  logoSrc?: string;
  navigation?: readonly NavItem[];
  socialLinks?: { label: string; href: string }[];
  hotline: string;
  hotlineHref: string;
  email: string;
  address: string;
  workingHours: string;
};
const Context = createContext<Contact>(siteConfig.contact);
export const SiteContactProvider = Context.Provider;
export const useSiteContact = () => useContext(Context);
