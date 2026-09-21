import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MONTHS } from "@/lib/account/profile";

const selectClass =
  "h-11 w-full rounded-lg border border-input bg-transparent px-2.5 text-base outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 md:text-sm";

/**
 * Shared by /signup and the "finish your profile" form on /account. Field
 * names match lib/account/profile.parseProfile. Birthday is month + day only.
 */
export function ProfileFields() {
  return (
    <>
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="firstName">First name</Label>
          <Input id="firstName" name="firstName" required maxLength={80} autoComplete="given-name" className="h-11" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="lastName">Last name</Label>
          <Input id="lastName" name="lastName" required maxLength={80} autoComplete="family-name" className="h-11" />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="personalEmail">
          Personal email <span className="font-normal text-neutral-500">(optional)</span>
        </Label>
        <Input
          id="personalEmail"
          name="personalEmail"
          type="email"
          autoComplete="off"
          className="h-11"
          aria-describedby="personalEmailHint"
        />
        <p id="personalEmailHint" className="text-xs text-neutral-500">
          Only if you signed up with a work address — so we can still reach you if that one changes.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
        <div className="space-y-1.5">
          <Label htmlFor="birthMonth">Birthday month</Label>
          <select id="birthMonth" name="birthMonth" required defaultValue="" className={selectClass} autoComplete="bday-month">
            <option value="" disabled>Month</option>
            {MONTHS.map((m, i) => (
              <option key={m} value={i + 1}>{m}</option>
            ))}
          </select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="birthDay">Day</Label>
          <select id="birthDay" name="birthDay" required defaultValue="" className={selectClass} autoComplete="bday-day">
            <option value="" disabled>Day</option>
            {Array.from({ length: 31 }, (_, i) => (
              <option key={i + 1} value={i + 1}>{i + 1}</option>
            ))}
          </select>
        </div>
        <div className="col-span-2 space-y-1.5 md:col-span-1">
          <Label htmlFor="zip">ZIP code</Label>
          <Input
            id="zip"
            name="zip"
            required
            inputMode="numeric"
            pattern="\d{5}"
            maxLength={5}
            autoComplete="postal-code"
            className="h-11"
          />
        </div>
      </div>

      <label className="flex items-start gap-2.5 text-sm text-neutral-700">
        <input type="checkbox" name="ageAttested" required className="mt-1" />
        <span>I confirm I am 21 years of age or older.</span>
      </label>
      <label className="flex items-start gap-2.5 text-sm text-neutral-700">
        <input type="checkbox" name="marketingOptIn" className="mt-1" />
        <span>
          Send me drops and news by email. Optional — covers the address(es) above. Unsubscribe any time.
        </span>
      </label>
    </>
  );
}
