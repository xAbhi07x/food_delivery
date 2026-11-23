"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { otpAction } from "./actions";
import type { OtpFormState } from "./form-state";
import type { Portal } from "./schemas";

const initialState: OtpFormState = { step: "phone" };

export function OtpLoginForm({ portal }: { portal: Portal }) {
  const [state, formAction, pending] = useActionState(otpAction, initialState);

  return (
    <form action={formAction} className="flex flex-col gap-4" noValidate>
      <input type="hidden" name="portal" value={portal} />

      {state.step === "phone" ? (
        <div className="flex flex-col gap-2">
          <Label htmlFor="phone">Mobile number</Label>
          <Input
            id="phone"
            name="phone"
            type="tel"
            inputMode="numeric"
            autoComplete="tel-national"
            placeholder="98765 43210"
            required
            defaultValue={state.phone ? state.phone.replace("+91", "") : ""}
          />
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          <input type="hidden" name="phone" value={state.phone} />
          <Label htmlFor="code">Code sent to {state.phone}</Label>
          <Input
            id="code"
            name="code"
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={6}
            placeholder="6-digit code"
            required
            autoFocus
          />
        </div>
      )}

      {state.notice && !state.error ? (
        <p role="status" className="text-sm text-muted-foreground">
          {state.notice}
        </p>
      ) : null}
      {state.error ? (
        <p role="alert" className="text-sm text-destructive">
          {state.error}
        </p>
      ) : null}

      {state.step === "phone" ? (
        <Button type="submit" name="intent" value="request" disabled={pending}>
          {pending ? "Sending…" : "Send code"}
        </Button>
      ) : (
        <>
          <Button type="submit" name="intent" value="verify" disabled={pending}>
            {pending ? "Verifying…" : "Verify and sign in"}
          </Button>
          <div className="flex justify-between gap-2">
            <Button
              type="submit"
              name="intent"
              value="request"
              variant="ghost"
              size="sm"
              formNoValidate
              disabled={pending}
            >
              Resend code
            </Button>
            <Button
              type="submit"
              name="intent"
              value="reset"
              variant="ghost"
              size="sm"
              formNoValidate
              disabled={pending}
            >
              Change number
            </Button>
          </div>
        </>
      )}
    </form>
  );
}
