"use client";

import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { ChevronDown } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function OfferingsMenu({
  mobile = false,
  solid = false,
  onNavigate,
}: {
  mobile?: boolean;
  solid?: boolean;
  onNavigate?: () => void;
}) {
  const locale = useLocale();
  const t = useTranslations("offerings");
  const items = [
    { path: "trade-schools", key: "schools" },
    { path: "enterprise", key: "enterprise" },
  ];
  if (mobile)
    return (
      <div className="rounded-xl bg-slate-950/[0.03] p-2">
        <p className="px-2 py-2 text-xs font-black uppercase tracking-wider text-slate-500">
          {t("label")}
        </p>
        {items.map((item) => (
          <Link
            key={item.path}
            href={`/${locale}/${item.path}`}
            onClick={onNavigate}
            className="block rounded-lg px-2 py-3 font-semibold text-slate-800 hover:bg-white"
          >
            {t(item.key)}
          </Link>
        ))}
      </div>
    );
  return (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className={`flex items-center gap-1.5 rounded-full px-3 py-2 text-sm font-semibold ${solid ? "text-slate-700 hover:bg-[#f4ede6]/55" : "text-white/78 hover:bg-white/10"}`}
        >
          {t("label")}
          <ChevronDown className="h-4 w-4" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="center"
        sideOffset={14}
        className="w-72 rounded-2xl border-[#eadfd7] bg-[#fffaf7] p-2 text-slate-950 shadow-xl"
      >
        {items.map((item) => (
          <DropdownMenuItem key={item.path} asChild className="rounded-xl p-0">
            <Link href={`/${locale}/${item.path}`} className="block px-4 py-3">
              <span className="block font-bold">{t(item.key)}</span>
              <span className="mt-1 block text-xs text-slate-600">
                {t(`${item.key}Description`)}
              </span>
            </Link>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
