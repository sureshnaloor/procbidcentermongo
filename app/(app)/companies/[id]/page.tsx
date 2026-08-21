"use client";

import { use } from "react";
import { useQuery } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Building2, Globe, MapPin, Phone, Users, FileText, ExternalLink, Loader2, Shield, MessageSquare } from "lucide-react";
import { PUBLIC_DOCUMENT_CATEGORIES } from "@/lib/constants";

function categoryLabel(value?: string) {
  return PUBLIC_DOCUMENT_CATEGORIES.find((c) => c.value === value)?.label ?? value ?? "Document";
}

export default function CompanyPublicPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { data: session } = useSession();
  const { data: company, isLoading } = useQuery({
    queryKey: ["company", id],
    queryFn: () => fetch(`/api/profile/${id}`).then((r) => r.json()),
  });
  const { data: me } = useQuery({
    queryKey: ["profile", "me"],
    queryFn: () => fetch("/api/profile").then((r) => r.json()),
    enabled: !!session,
  });

  if (isLoading) return <div className="flex justify-center py-16"><Loader2 className="animate-spin h-6 w-6 text-muted-foreground" /></div>;
  if (!company || company.userType !== "company") {
    return <div className="text-center py-16 text-muted-foreground">Company not found</div>;
  }

  const docs = company.publicDocuments ?? [];

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Building2 className="h-5 w-5 text-primary" />
            <h1 className="text-2xl font-bold text-foreground">{company.companyName || "Company"}</h1>
            {company.isVerified && <Badge variant="success" className="flex items-center gap-1"><Shield className="h-3 w-3" />Verified</Badge>}
          </div>
          <p className="text-sm text-muted-foreground">{company.industry || "EPC Company"}</p>
        </div>
        {me?.userType === "vendor" && String(me._id) !== String(company._id) && (
          <Link href={`/messages/dm/${company._id}`}>
            <Button size="sm"><MessageSquare className="h-4 w-4" /> Message</Button>
          </Link>
        )}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {company.employeeCount != null && (
          <Stat label="Employees" value={company.employeeCount.toLocaleString()} icon={Users} />
        )}
        {company.annualTurnover != null && (
          <Stat
            label={`Turnover${company.turnoverYear ? ` (${company.turnoverYear})` : ""}`}
            value={`${company.turnoverCurrency || "USD"} ${Number(company.annualTurnover).toLocaleString()}`}
          />
        )}
        {company.yearEstablished && <Stat label="Established" value={String(company.yearEstablished)} />}
        {(company.city || company.country) && (
          <Stat label="Location" value={[company.city, company.country].filter(Boolean).join(", ")} icon={MapPin} />
        )}
      </div>

      <Card>
        <CardHeader><CardTitle className="text-sm">Company information</CardTitle></CardHeader>
        <CardContent className="space-y-3 text-sm">
          {company.description && <p className="text-foreground dark:text-muted-foreground whitespace-pre-wrap">{company.description}</p>}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-muted-foreground">
            {company.registrationNumber && <div>Registration: {company.registrationNumber}</div>}
            {company.taxId && <div>Tax / GST: {company.taxId}</div>}
            {company.contactPerson && <div>Contact: {company.contactPerson}</div>}
            {company.phone && <div className="flex items-center gap-1"><Phone className="h-3.5 w-3.5" />{company.phone}</div>}
            {company.address && <div className="md:col-span-2">{company.address}</div>}
            {company.website && (
              <a href={company.website.startsWith("http") ? company.website : `https://${company.website}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-primary hover:underline">
                <Globe className="h-3.5 w-3.5" />{company.website}
              </a>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-sm">Public documents</CardTitle></CardHeader>
        <CardContent>
          {docs.length === 0 ? (
            <p className="text-sm text-muted-foreground">No public documents shared yet.</p>
          ) : (
            <div className="grid gap-2">
              {docs.map((d: any) => (
                <a key={d._id} href={d.fileUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 rounded-lg border border-border p-3 hover:bg-accent">
                  <FileText className="h-4 w-4 text-primary shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">{d.name}</div>
                    <div className="text-xs text-muted-foreground">{categoryLabel(d.category)}</div>
                  </div>
                  <ExternalLink className="h-3.5 w-3.5 text-muted-foreground" />
                </a>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function Stat({ label, value, icon: Icon }: { label: string; value: string; icon?: React.ElementType }) {
  return (
    <div className="rounded-lg border border-border p-3">
      <div className="flex items-center gap-1.5 mb-1 text-xs text-muted-foreground">
        {Icon && <Icon className="h-3.5 w-3.5" />}
        {label}
      </div>
      <div className="font-semibold text-sm">{value}</div>
    </div>
  );
}
