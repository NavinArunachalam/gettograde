import { useEffect, useState } from "react";
import { api } from "@/lib/api";

export type OrganizationDetails = {
  name: string;
  url: string;
  email: string;
  phone: string;
  hours: string;
  address: string;
  gst: string;
  timezone: string;
  about: string;
};

export const defaultOrganization: OrganizationDetails = {
  name: "Beyond20",
  url: "beyond20.academy",
  email: "info@beyond20.academy",
  phone: "+91 98765 43210",
  hours: "Monday - Saturday, 9 AM to 7 PM",
  address: "Plot 42, Tech Park, Outer Ring Road, Bengaluru - 560103",
  gst: "29AABCM1234C1ZK",
  timezone: "Asia/Kolkata",
  about: "Welcome to Beyond20 — a professional training academy built for turning learners into industry-ready professionals.",
};

export function normalizeOrganization(raw: Partial<OrganizationDetails> = {}): OrganizationDetails {
  return {
    ...defaultOrganization,
    ...Object.fromEntries(
      Object.entries(raw).filter(([, value]) => value !== undefined && value !== null && value !== "")
    ),
  };
}

export function useOrganizationDetails() {
  const [organization, setOrganization] = useState<OrganizationDetails>(defaultOrganization);

  useEffect(() => {
    let mounted = true;

    api.get("/public/contact-details")
      .then((res) => {
        if (mounted && res.success && res.contactDetails) {
          setOrganization(normalizeOrganization(res.contactDetails));
        }
      })
      .catch((err) => {
        console.error("Failed to load organization details:", err);
      });

    return () => {
      mounted = false;
    };
  }, []);

  return organization;
}
