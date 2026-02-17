import { ContactList } from "@/components/contacts/contact-list";

interface PageProps {
  params: Promise<{ id: string }>;
}

export const metadata = {
  title: "Clientes",
};

export default async function ClientsPage({ params }: PageProps) {
  const { id } = await params;

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <ContactList companyId={id} type="client" />
    </div>
  );
}
