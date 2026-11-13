/** Site navigation, shared by header and footer so labels and targets cannot drift. */
export const mainNav = [
  { href: "/machines", label: "Machines" },
  { href: "/#choosing-help", label: "Choosing Help" },
  { href: "/support", label: "Support" },
  { href: "/locations", label: "Locations" },
] as const;

export const footerNav = [
  {
    heading: "Explore",
    links: [
      { href: "/machines", label: "Machines" },
      { href: "/#choosing-help", label: "Choosing Help" },
    ],
  },
  {
    heading: "Help",
    links: [
      { href: "/support", label: "Support" },
      { href: "/locations", label: "Locations" },
      { href: "/support#contact", label: "Contact" },
    ],
  },
  {
    heading: "Business",
    links: [{ href: "/enquiry?intent=trade", label: "Trade Enquiry" }],
  },
] as const;
