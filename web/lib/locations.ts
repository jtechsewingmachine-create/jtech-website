/**
 * Prototype locations. Every entry is FICTIONAL (blueprint: mock locations must stay clearly
 * fictional and must not imply authorisation, coverage or distance). Replace with verified data.
 */
export type Service = "Sales" | "Demonstrations" | "General repairs" | "Authorised warranty service";

export interface Location {
  id: string;
  name: string;
  area: string;
  services: Service[];
  fictional: true;
}

export const locations: Location[] = [
  {
    id: "example-a",
    name: "Example Sewing Centre A",
    area: "Sample Town (fictional)",
    services: ["Sales", "Demonstrations"],
    fictional: true,
  },
  {
    id: "example-b",
    name: "Example Repair Point B",
    area: "Sample City (fictional)",
    services: ["General repairs"],
    fictional: true,
  },
];
