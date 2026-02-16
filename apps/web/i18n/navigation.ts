import { createNavigation } from "next-intl/navigation";
import { routing } from "@/src/i18n";

export const { Link, redirect, usePathname, useRouter } =
  createNavigation(routing);
