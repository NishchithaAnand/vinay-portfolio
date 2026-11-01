import * as React from "react";
import { AnimatePresence, motion } from "motion/react";
import { Reveal, RevealHeading, RevealImage } from "@/components/motion/reveal";
import { Picture } from "@/components/ui/picture-frame";
import { artworks } from "@/content/artworks";
import { onEnquiryRequest } from "@/content/enquiry";
import { site } from "@/content/site";
import { cn } from "@/lib/utils";

const EASE = [0.16, 1, 0.3, 1] as const;
/** The painting beside the form. Hands, reaching: fitting for a note to the artist. */
const PAINTING_ID = "hands";
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

type Fields = { name: string; email: string; message: string };
type Status = "idle" | "sending" | "sent" | "opened-mail" | "failed";

function errorsOf(fields: Fields) {
  return {
    name: fields.name.trim() ? "" : "Please add your name.",
    email: !fields.email.trim() ? "Please add your email." : EMAIL.test(fields.email.trim()) ? "" : "That email doesn't look right.",
  };
}

function mailtoFor(fields: Fields, topic: string | null) {
  const subject = topic ? `Inquiry: ${topic}` : `Inquiry from ${fields.name.trim()}`;
  const body = [fields.message.trim(), "", `${fields.name.trim()}`, fields.email.trim()].filter((line, i) => i > 0 || line).join("\n");
  return `mailto:${site.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

/** A field with an underline that darkens on focus and a label above; errors appear underneath. */
function Field({ id, label, hint, error, children }: { id: string; label: string; hint?: string; error?: string; children: React.ReactNode }) {
  return (
    <div>
      <label htmlFor={id} className="flex items-baseline justify-between gap-3 text-sm">
        <span className="font-medium">{label}</span>
        {hint && <span className="text-[13px] text-muted-foreground">{hint}</span>}
      </label>
      {children}
      <AnimatePresence initial={false}>
        {error && (
          <motion.p id={`${id}-error`} initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.25 }} className="mt-2 text-[13px] text-destructive">
            {error}
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  );
}

const inputClass =
  "mt-2 block w-full border-0 border-b border-border bg-transparent px-0 py-2.5 text-base outline-none transition-colors duration-300 placeholder:text-muted-foreground/60 focus:border-foreground aria-invalid:border-destructive motion-reduce:transition-none";

export function Contact() {
  const painting = artworks.find((work) => work.id === PAINTING_ID) ?? artworks[0];
  const section = React.useRef<HTMLElement>(null);
  const nameInput = React.useRef<HTMLInputElement>(null);
  const [fields, setFields] = React.useState<Fields>({ name: "", email: "", message: "" });
  const [touched, setTouched] = React.useState({ name: false, email: false });
  const [topic, setTopic] = React.useState<string | null>(null);
  const [status, setStatus] = React.useState<Status>("idle");
  const errors = errorsOf(fields);

  // "Enquire about this work" anywhere on the page lands here with the work named and the form in view.
  React.useEffect(
    () =>
      onEnquiryRequest((next) => {
        setTopic(next);
        setStatus("idle");
        section.current?.scrollIntoView({ behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "start" });
        window.setTimeout(() => nameInput.current?.focus({ preventScroll: true }), 700);
      }),
    [],
  );

  const update = (key: keyof Fields) => (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setFields((f) => ({ ...f, [key]: event.target.value }));

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setTouched({ name: true, email: true });
    if (errors.name || errors.email) {
      (errors.name ? nameInput.current : event.currentTarget.querySelector<HTMLInputElement>("#contact-email"))?.focus();
      return;
    }
    // Bots fill every field, people never see this one.
    if ((event.currentTarget.elements.namedItem("company") as HTMLInputElement | null)?.value) return;

    if (!site.formEndpoint) {
      window.location.href = mailtoFor(fields, topic);
      setStatus("opened-mail");
      return;
    }
    setStatus("sending");
    try {
      const response = await fetch(site.formEndpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({ name: fields.name.trim(), email: fields.email.trim(), message: fields.message.trim(), topic: topic ?? "" }),
      });
      setStatus(response.ok ? "sent" : "failed");
    } catch {
      setStatus("failed");
    }
  };

  const reset = () => {
    setFields({ name: "", email: "", message: "" });
    setTouched({ name: false, email: false });
    setTopic(null);
    setStatus("idle");
  };

  const done = status === "sent" || status === "opened-mail";
  const firstName = fields.name.trim().split(/\s+/)[0];

  return (
    <section ref={section} id="contact" aria-labelledby="contact-title" className="mx-auto w-full max-w-[1440px] scroll-mt-14 px-5 pt-section sm:scroll-mt-16 sm:px-8">
      <RevealHeading id="contact-title" className="display text-title" text="Get in touch" />

      <div className="mt-10 grid gap-12 lg:mt-14 lg:grid-cols-12 lg:gap-16">
        {painting && (
          <figure className="m-0 lg:col-span-5">
            <RevealImage delay={0.1}>
            <Picture src={painting.image} avif={painting.imageAvif} alt={`${painting.title}, by ${site.name}`} loading="lazy" decoding="async" className="block w-full object-cover shadow-[0_30px_60px_-30px_rgb(0_0_0/0.5)]" style={{ aspectRatio: String(painting.aspect ?? 0.8) }} />
            </RevealImage>
            <Reveal delay={0.45} y={10}>
            <figcaption className="mt-4 text-[13px] text-muted-foreground">
              <span className="font-medium text-foreground">{painting.title}</span>
              {painting.medium && <> · {painting.medium}</>}
            </figcaption>
            </Reveal>
          </figure>
        )}

        <div className="lg:col-span-7 lg:col-start-7 lg:pt-2">
          <Reveal delay={0.2}>
          <p className="max-w-lg text-lede text-muted-foreground">
            Ask about a work, a commission, or anything else. Your message goes straight to {site.name}.
          </p>
          </Reveal>

          <AnimatePresence mode="wait" initial={false}>
            {done ? (
              <motion.div key="done" role="status" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.6, ease: EASE }} className="mt-12 max-w-lg border-t border-border pt-8">
                <span aria-hidden="true" className="flex size-11 items-center justify-center rounded-full bg-foreground text-background">
                  <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M4 9.5l3.2 3L14 5.5" /></svg>
                </span>
                {status === "sent" ? (
                  <>
                    <p className="display mt-6 text-3xl">Thank you{firstName ? `, ${firstName}` : ""}.</p>
                    <p className="mt-3 text-muted-foreground">Your inquiry is on its way. {site.name} will reply to {fields.email.trim()}.</p>
                  </>
                ) : (
                  <>
                    <p className="display mt-6 text-3xl">Almost there{firstName ? `, ${firstName}` : ""}.</p>
                    <p className="mt-3 text-muted-foreground">
                      Your email app should have opened with the message written out. Press send there and it goes to {site.name}. If nothing opened, write to{" "}
                      <a href={mailtoFor(fields, topic)} className="link-draw pb-0.5 text-foreground">{site.email}</a>.
                    </p>
                  </>
                )}
                <button type="button" onClick={reset} className="link-draw mt-8 pb-0.5 text-sm">Send another inquiry</button>
              </motion.div>
            ) : (
              <motion.form key="form" noValidate onSubmit={submit} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.4 }} className="mt-12 max-w-lg space-y-9">
                <AnimatePresence initial={false}>
                  {topic && (
                    <motion.p initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="flex items-center gap-3 overflow-hidden text-sm">
                      <span className="text-muted-foreground">About</span>
                      <span className="inline-flex items-center gap-2 rounded-full bg-muted py-1 pl-3 pr-1.5 font-medium">
                        {topic}
                        <button type="button" onClick={() => setTopic(null)} aria-label={`Not about ${topic}`} className="flex size-5 items-center justify-center rounded-full text-muted-foreground outline-none hover:bg-background hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring">
                          <svg aria-hidden="true" width="8" height="8" viewBox="0 0 10 10"><path d="M1 1l8 8M9 1L1 9" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" /></svg>
                        </button>
                      </span>
                    </motion.p>
                  )}
                </AnimatePresence>

                <Reveal delay={0.3} y={16}>
                <Field id="contact-name" label="Name" error={touched.name ? errors.name : ""}>
                  <input ref={nameInput} id="contact-name" name="name" autoComplete="name" value={fields.name} onChange={update("name")} onBlur={() => setTouched((t) => ({ ...t, name: true }))} aria-invalid={touched.name && !!errors.name} aria-describedby={touched.name && errors.name ? "contact-name-error" : undefined} className={inputClass} placeholder="Your name" />
                </Field>
                </Reveal>

                <Reveal delay={0.4} y={16}>
                <Field id="contact-email" label="Email" error={touched.email ? errors.email : ""}>
                  <input id="contact-email" name="email" type="email" inputMode="email" autoComplete="email" value={fields.email} onChange={update("email")} onBlur={() => setTouched((t) => ({ ...t, email: true }))} aria-invalid={touched.email && !!errors.email} aria-describedby={touched.email && errors.email ? "contact-email-error" : undefined} className={inputClass} placeholder="you@example.com" />
                </Field>
                </Reveal>

                <Reveal delay={0.5} y={16}>
                <Field id="contact-message" label="Message" hint="Optional">
                  <textarea id="contact-message" name="message" rows={4} value={fields.message} onChange={update("message")} className={cn(inputClass, "resize-none [field-sizing:content] min-h-24")} placeholder={topic ? `Anything you'd like to know about ${topic}?` : "What would you like to ask?"} />
                </Field>
                </Reveal>

                <input type="text" name="company" tabIndex={-1} autoComplete="off" aria-hidden="true" className="absolute -left-[9999px] size-px opacity-0" />

                {status === "failed" && (
                  <p role="alert" className="text-sm text-destructive">
                    It didn't send. Please try again, or write to <a href={mailtoFor(fields, topic)} className="underline underline-offset-4">{site.email}</a>.
                  </p>
                )}

                <Reveal delay={0.6} y={16}>
                <button
                  type="submit"
                  disabled={status === "sending"}
                  className="group inline-flex h-12 items-center gap-2.5 rounded-full bg-primary px-7 text-sm font-medium text-primary-foreground outline-none transition-colors hover:bg-primary/85 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:opacity-70 motion-reduce:transition-none"
                >
                  {status === "sending" ? "Sending…" : "Send inquiry"}
                  {status === "sending" ? (
                    <span aria-hidden="true" className="size-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />
                  ) : (
                    <svg aria-hidden="true" width="14" height="14" viewBox="0 0 14 14" className="transition-transform duration-500 group-hover:translate-x-0.5 motion-reduce:transition-none"><path d="M2 7h10M8 3l4 4-4 4" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" /></svg>
                  )}
                </button>
                </Reveal>
              </motion.form>
            )}
          </AnimatePresence>
        </div>
      </div>
    </section>
  );
}
