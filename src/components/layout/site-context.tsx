"use client";
import { createContext, useContext } from "react";
import { siteConfig } from "@/config/site";
type Contact = {
  name?: string;
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
