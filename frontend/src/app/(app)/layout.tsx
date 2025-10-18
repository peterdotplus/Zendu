import { Navbar } from "@/components/Navbar";

export default function AppLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <>
      <Navbar />
      <main className="max-w-[92rem] mx-auto px-4 py-6">{children}</main>
    </>
  );
}

