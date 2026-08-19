import { Fragment, type ReactNode } from "react";

/**
 * Renders `**bold**` spans from dictionary copy.
 *
 * Translators get one convention to preserve instead of a sentence split
 * across several keys, which is both easier to translate well and safer for
 * languages that order the clause differently.
 */
export function renderRich(text: string): ReactNode {
  return text
    .split(/(\*\*[^*]+\*\*)/g)
    .filter(Boolean)
    .map((part, index) =>
      part.startsWith("**") && part.endsWith("**") ? (
        <strong key={index}>{part.slice(2, -2)}</strong>
      ) : (
        <Fragment key={index}>{part}</Fragment>
      ),
    );
}
