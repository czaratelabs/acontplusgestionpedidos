"use client";

import { useRouter } from "next/navigation";
import Cookies from "js-cookie";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export function UserNav({ email, name }: { email: string; name: string }) {
  const router = useRouter();

  const handleLogout = () => {
    // 1. Borrar el Pasaporte (Cookie)
    Cookies.remove("token");
    
    // 2. Limpiar datos locales
    localStorage.removeItem("user");

    // 3. Mandar al login
    router.push("/login");
  };

  // Generar iniciales para el avatar (Ej: Christian Zarate -> CZ)
  const initials = name
    ? name.split(" ").map((n) => n[0]).join("").substring(0, 2).toUpperCase()
    : "U";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="relative h-14 w-full justify-start gap-3 rounded-lg px-2 hover:bg-slate-800">
          <Avatar className="h-10 w-10">
            <AvatarImage src={`https://api.dicebear.com/7.x/initials/svg?seed=${name}`} alt={name} />
            <AvatarFallback className="bg-blue-600 text-white">{initials}</AvatarFallback>
          </Avatar>
          <div className="flex flex-col items-start text-left overflow-hidden">
            <p className="text-sm font-medium text-white truncate w-32">{name}</p>
            <p className="text-xs text-slate-400 truncate w-32">{email}</p>
          </div>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56" align="end" forceMount>
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium leading-none">{name}</p>
            <p className="text-xs leading-none text-muted-foreground">
              {email}
            </p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem>
          👤 Mi Perfil
        </DropdownMenuItem>
        <DropdownMenuItem>
          💳 Suscripción
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleLogout} className="text-red-600 cursor-pointer focus:text-red-600">
          🚪 Cerrar Sesión
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}