import { useRouter } from "next/router"
import Link from "next/link"
import { Menu, UserCheck, Users, Building2, Home, Settings, X, Sun, Moon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetTrigger, SheetClose } from "@/components/ui/sheet"
import { cn } from "@/lib/utils"
import { useEffect, useState } from "react"

const navItems = [
  { href: "/ingreso", label: "Ingreso", icon: Home },
  { href: "/empleados", label: "Empleados", icon: UserCheck },
  { href: "/visitantes", label: "Visitantes", icon: Users },
  { href: "/residentes", label: "Residentes", icon: Building2 },
  { href: "/configuracion", label: "Configuración", icon: Settings },
]

export default function Layout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [dark, setDark] = useState(false)

  useEffect(() => {
    const stored = localStorage.getItem('theme')
    if (stored === 'dark' || (!stored && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
      document.documentElement.classList.add('dark')
      setDark(true)
    }
  }, [])

  const toggleTheme = () => {
    const next = !dark
    setDark(next)
    document.documentElement.classList.toggle('dark', next)
    localStorage.setItem('theme', next ? 'dark' : 'light')
  }

  const nav = (
    <nav className="flex flex-col gap-1">
      {navItems.map((item) => {
        const Icon = item.icon
        const isActive = router.pathname === item.href
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={() => setOpen(false)}
            className={cn(
              "flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors",
              isActive
                ? "bg-primary/10 text-primary"
                : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
            )}
          >
            <Icon className="h-4 w-4" />
            {item.label}
          </Link>
        )
      })}
    </nav>
  )

  return (
    <div className="min-h-screen bg-background flex">
      <aside className="hidden md:flex flex-col w-56 border-r bg-muted/30 fixed inset-y-0 left-0 z-30">
        <div className="flex items-center justify-between h-16 px-4 border-b font-semibold">
          <span className="text-xl leading-none" style={{ fontFamily: "'Avenir Next', Avenir, sans-serif", fontWeight: 400 }}>Finca tennis</span>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={toggleTheme}>
            {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </Button>
        </div>
        <div className="flex-1 overflow-y-auto p-3">{nav}</div>
      </aside>

      <div className="md:pl-56 flex-1 flex flex-col min-h-screen">
        <header className="md:hidden sticky top-0 z-40 border-b bg-background flex items-center h-16 px-4">
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-56 p-0">
              <div className="flex items-center gap-3 h-16 px-4 border-b font-semibold">
                <span className="text-xl leading-none" style={{ fontFamily: "'Avenir Next', Avenir, sans-serif", fontWeight: 400 }}>Finca tennis</span>
                <SheetClose asChild>
                  <Button variant="ghost" size="icon">
                    <X className="h-4 w-4" />
                  </Button>
                </SheetClose>
              </div>
              <div className="p-3">{nav}</div>
            </SheetContent>
          </Sheet>
          <span className="ml-3 font-semibold">Control de Ingreso</span>
          <div className="ml-auto">
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={toggleTheme}>
              {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </Button>
          </div>
        </header>

        <main className="flex-1 p-4 md:p-6 lg:p-8">{children}</main>
      </div>
    </div>
  )
}
