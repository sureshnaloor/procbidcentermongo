"use client";

import { use } from "react";
import { useQuery } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Building2, Globe, MapPin, Phone, FileText, ExternalLink, Loader2, Shield, MessageSquare, ArrowLeft } from "lucide-react";
import { PUBLIC_DOCUMENT_CATEGORIES } from "@/lib/constants";

function categoryLabel(value?: string) {
  return PUBLIC_DOCUMENT_CATEGORIES.find((c) => c.value === value)?.label ?? value ?? "Document";
}

export default function VendorPublicPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { data: session } = useSession();
  const { data: vendor, isLoading } = useQuery({
    queryKey: ["vendor", id],
    queryFn: () => fetch(`/api/profile/${id}`).then((r) => r.json()),
  });
  const { data: me } = useQuery({
    queryKey: ["profile", "me"],
    queryFn: () => fetch("/api/profile").then((r) => r.json()),
    enabled: !!session,
  });

  if (isLoading) return <div className="flex justify-center py-16"><Loader2 className="animate-spin h-6 w-6 text-muted-foreground" /></div>;
  if (!vendor || vendor.userType !== "vendor") {
    return <div className="text-center py-16 text-muted-foreground">Supplier not found</div>;
  }

  const docs = vendor.publicDocuments ?? [];
  const groups = vendor.capabilityGroups ?? [];
  const materialGroups = groups.filter((g: any) => g.category === "material");
  const serviceGroups = groups.filter((g: any) => g.category === "service");
  const canMessage = me && String(me._id) !== String(vendor._id);

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <Link href="/vendors" className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground mb-2">
            <ArrowLeft className="h-3.5 w-3.5" /> All suppliers
          </Link>
          <div className="flex items-center gap-2 mb-1">
            <Building2 className="h-5 w-5 text-primary" />
            <h1 className="text-2xl font-bold text-foreground">{vendor.companyName || "Supplier"}</h1>
            {vendor.isVerified && <Badge variant="success" className="flex items-center gap-1"><Shield className="h-3 w-3" />Verified</Badge>}
          </div>
          <p className="text-sm text-muted-foreground">
            {[vendor.city, vendor.country].filter(Boolean).join(", ") || "Registered supplier"}
          </p>
        </div>
        {canMessage && (
          <Link href={`/messages/dm/${vendor._id}`}>
            <Button size="sm"><MessageSquare className="h-4 w-4" /> Message</Button>
          </Link>
        )}
      </div>

      <p className="text-sm text-muted-foreground">
        Review this supplier&apos;s groups and documents before inviting them to an RFQ, RFP, or tender.
      </p>

      <Card>
        <CardHeader><CardTitle className="text-sm">Material &amp; service groups</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          {groups.length === 0 ? (
            <p className="text-sm text-muted-foreground">This supplier has not declared any material or service groups yet.</p>
          ) : (
            <>
              {materialGroups.length > 0 && (
                <div className="space-y-2">
                  <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Materials</div>
                  <div className="flex flex-wrap gap-2">
                    {materialGroups.map((g: any) => (
                      <Badge key={g._id} variant="outline">{g.name}</Badge>
                    ))}
                  </div>
                </div>
              )}
              {serviceGroups.length > 0 && (
                <div className="space-y-2">
                  <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Services</div>
                  <div className="flex flex-wrap gap-2">
                    {serviceGroups.map((g: any) => (
                      <Badge key={g._id}>{g.name}</Badge>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-sm">Supplier information</CardTitle></CardHeader>
        <CardContent className="space-y-3 text-sm">
          {vendor.description && <p className="text-foreground dark:text-muted-foreground whitespace-pre-wrap">{vendor.description}</p>}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-muted-foreground">
            {vendor.registrationNumber && <div>Registration: {vendor.registrationNumber}</div>}
            {vendor.contactPerson && <div>Contact: {vendor.contactPerson}</div>}
            {vendor.phone && <div className="flex items-center gap-1"><Phone className="h-3.5 w-3.5" />{vendor.phone}</div>}
            {(vendor.city || vendor.country) && (
              <div className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5" />{[vendor.city, vendor.country].filter(Boolean).join(", ")}</div>
            )}
            {vendor.address && <div className="md:col-span-2">{vendor.address}</div>}
            {vendor.website && (
              <a href={vendor.website.startsWith("http") ? vendor.website : `https://${vendor.website}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-primary hover:underline">
                <Globe className="h-3.5 w-3.5" />{vendor.website}
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
