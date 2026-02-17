import { ContactList } from "@/components/contacts/contact-list";

interface PageProps {
  params: Promise<{ id: string }>;
}

export const metadata = {
  title: "Proveedores",
};

export default async function ProvidersPage({ params }: PageProps) {
  const { id } = await params;

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <ContactList companyId={id} type="supplier" />
    </div>
  );
}
