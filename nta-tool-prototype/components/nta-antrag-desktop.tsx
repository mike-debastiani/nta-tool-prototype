"use client";

import { useState, type ReactNode } from "react";
import {
  Circle,
  CircleArrowRight,
  CircleDashed,
  Eye,
  FileText,
  MessageCircle,
  Upload,
  User,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { StudiengangCombobox } from "@/components/studiengang-combobox";
import { cn } from "@/lib/utils";

type ProgressRowProps = {
  icon: ReactNode;
  label: string;
  trailing: ReactNode;
  labelClassName?: string;
};

function ProgressRow({
  icon,
  label,
  trailing,
  labelClassName,
}: ProgressRowProps) {
  return (
    <div className="flex h-8 items-center justify-between rounded-md py-1 pl-3">
      <div className="flex min-w-0 items-center gap-2">
        <span className="flex size-4 shrink-0 items-center justify-center text-current [&_svg]:size-4">
          {icon}
        </span>
        <span
          className={cn(
            "truncate text-sm leading-5",
            labelClassName ?? "text-foreground",
          )}
        >
          {label}
        </span>
      </div>
      <span className="flex size-4 shrink-0 items-center justify-center text-current [&_svg]:size-4">
        {trailing}
      </span>
    </div>
  );
}

const SEMESTER_NUMBERS = Array.from({ length: 12 }, (_, i) => i + 1);

export function NtaAntragDesktop() {
  const [vorname, setVorname] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [matrikel, setMatrikel] = useState("");
  const [studiengang, setStudiengang] = useState("");
  const [semester, setSemester] = useState("");

  return (
    <div className="flex min-h-screen w-full bg-background">
      {/* Left — process */}
      <aside className="flex w-[min(100%,366px)] shrink-0 flex-col gap-8 border-r border-border bg-sidebar p-8">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          Prozessfortschritt
        </h1>
        <nav className="flex flex-col gap-2" aria-label="Prozessfortschritt">
          <ProgressRow
            icon={<User className="stroke-[1.75]" />}
            label="Persönliche Angaben"
            trailing={<CircleArrowRight className="stroke-[1.75]" />}
          />
          <ProgressRow
            icon={<Upload className="stroke-[1.75]" />}
            label="Fachärztliches Attest"
            labelClassName="text-neutral-400"
            trailing={<Circle className="stroke-[1.75] text-neutral-400" />}
          />
          <ProgressRow
            icon={<MessageCircle className="stroke-[1.75]" />}
            label="Beratung und Empfehlung"
            labelClassName="text-neutral-400"
            trailing={<Circle className="stroke-[1.75] text-neutral-400" />}
          />
          <div
            className="mx-auto my-1 h-px max-w-[243px] w-full border-0 border-t border-dashed border-border"
            aria-hidden
          />
          <ProgressRow
            icon={<FileText className="stroke-[1.75]" />}
            label="Antrag stellen"
            labelClassName="text-neutral-200"
            trailing={
              <CircleDashed className="stroke-[1.75] text-neutral-200" />
            }
          />
          <ProgressRow
            icon={<Eye className="stroke-[1.75]" />}
            label="Übersicht"
            labelClassName="text-neutral-200"
            trailing={
              <CircleDashed className="stroke-[1.75] text-neutral-200" />
            }
          />
        </nav>
      </aside>

      {/* Center — form */}
      <main className="flex min-w-0 flex-1 justify-center bg-background px-6 pt-[93px] pb-16">
        <Card className="h-fit w-full max-w-[774px] gap-0 border border-border py-0 shadow-xs ring-0">
          <CardContent className="flex flex-col gap-8 px-6 pt-6 pb-8">
            <div className="flex flex-col gap-8">
              <div className="flex flex-col gap-6">
                <CardTitle className="text-lg font-medium leading-[27px] text-foreground">
                  Persönliche Angaben
                </CardTitle>
                <div className="flex flex-col gap-6">
                  <div className="grid gap-6 md:grid-cols-2 md:gap-x-[29px]">
                    <div className="flex flex-col gap-1">
                      <Label htmlFor="vorname">Vorname</Label>
                      <Input
                        id="vorname"
                        name="vorname"
                        placeholder="Vorname"
                        value={vorname}
                        onChange={(e) => setVorname(e.target.value)}
                        autoComplete="given-name"
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <Label htmlFor="name">Name</Label>
                      <Input
                        id="name"
                        name="name"
                        placeholder="Name"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        autoComplete="family-name"
                      />
                    </div>
                  </div>
                  <div className="grid gap-6 md:grid-cols-2 md:gap-x-[29px]">
                    <div className="flex flex-col gap-1">
                      <Label htmlFor="email">Email</Label>
                      <Input
                        id="email"
                        name="email"
                        type="email"
                        placeholder="@hochschule.ch"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        autoComplete="email"
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <Label htmlFor="phone">Telefonnummer</Label>
                      <Input
                        id="phone"
                        name="phone"
                        type="tel"
                        placeholder="+41"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        autoComplete="tel"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-5">
                <CardTitle className="text-lg font-medium leading-[27px] text-foreground">
                  Angaben zum Studium
                </CardTitle>
                <div className="flex flex-col gap-6">
                  <div className="flex max-w-[320px] flex-col gap-1">
                    <Label htmlFor="matrikel">Matrikelnummer</Label>
                    <Input
                      id="matrikel"
                      name="matrikel"
                      placeholder="00-000-000"
                      value={matrikel}
                      onChange={(e) => setMatrikel(e.target.value)}
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <Label htmlFor="studiengang">Studiengang</Label>
                    <StudiengangCombobox
                      id="studiengang"
                      value={studiengang}
                      onValueChange={setStudiengang}
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <Label htmlFor="semester">
                      Welches Semester besuchen Sie
                    </Label>
                    <Select
                      value={semester || undefined}
                      onValueChange={setSemester}
                    >
                      <SelectTrigger
                        id="semester"
                        className="w-full border-neutral-300 bg-background shadow-xs dark:border-neutral-600"
                      >
                        <SelectValue placeholder="Semester wählen" />
                      </SelectTrigger>
                      <SelectContent>
                        {SEMESTER_NUMBERS.map((n) => (
                          <SelectItem key={n} value={String(n)}>
                            Semester {n}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
          <CardFooter className="px-6 py-6 pt-0">
            <Button type="button" className="min-h-9 px-4">
              Weiter
            </Button>
          </CardFooter>
        </Card>
      </main>

      {/* Right — contact */}
      <aside className="flex w-[min(100%,252px)] shrink-0 flex-col justify-end border-l border-border bg-sidebar p-8">
        <Card className="rounded-xl border-0 bg-background py-3 shadow-none ring-0">
          <CardContent className="px-3 py-0 text-xs leading-4">
            <p className="mb-3 font-medium text-foreground">
              Fragen und Unklarheiten?
            </p>
            <p className="mb-3 text-foreground">
              Kontaktieren Sie unsere Kontaktstelle unter:
            </p>
            <p className="text-foreground">
              <span className="underline underline-offset-2">
                beispiel@hochschule.ch
              </span>
              <br />
              <span>+41 55 120 36 56</span>
            </p>
          </CardContent>
        </Card>
      </aside>
    </div>
  );
}
