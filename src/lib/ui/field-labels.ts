/** Keep legacy labels accessible without changing captions, values or validation. */
const controls = 'input:not([type="hidden"]):not([type="button"]):not([type="submit"]):not([type="reset"]):not([type="image"]),textarea,select,[role="combobox"],[role="textbox"],[role="spinbutton"],[role="slider"],[role="checkbox"],[role="radio"],[role="switch"]';
const choices = 'input[type="checkbox"],input[type="radio"],[role="checkbox"],[role="radio"],[role="switch"],[role="slider"],input[type="range"]';

function controlWithin(element: Element): HTMLElement | null {
  const candidates = (element.matches(controls) ? [element] : [...element.querySelectorAll(controls)])
    .filter(item => !item.closest('[aria-hidden="true"]'));
  return candidates.length === 1 ? candidates[0] as HTMLElement : null;
}

function associatedControl(label: HTMLLabelElement): HTMLElement | null {
  if (label.htmlFor) {
    const target = label.ownerDocument.getElementById(label.htmlFor);
    return target?.matches(controls) ? target : null;
  }
  const nested = controlWithin(label);
  if (nested) return nested;
  // Legacy forms often place a label beside a wrapper rather than using for/id.
  // Stay within the immediate field; never borrow a different labelled field.
  let anchor: Element | null = label;
  for (let depth = 0; anchor && depth < 3; depth++, anchor = anchor.parentElement) {
    let sibling = anchor.nextElementSibling;
    for (let count = 0; sibling && count < 3; count++, sibling = sibling.nextElementSibling) {
      if (sibling.matches('label,h1,h2,h3,h4,h5,h6,fieldset,form') || sibling.querySelector('label')) return null;
      const target = controlWithin(sibling);
      if (target) return target;
      if (sibling.querySelector(controls)) return null;
    }
    if (anchor.parentElement?.matches('form,fieldset,body')) break;
  }
  return null;
}

function labelText(label: HTMLLabelElement): string {
  const walker = label.ownerDocument.createTreeWalker(label, 4);
  const parts: string[] = [];
  let node: Node | null;
  while ((node = walker.nextNode())) {
    if (!node.parentElement?.closest(`${controls},[aria-hidden="true"]`)) parts.push(node.textContent ?? '');
  }
  return parts.join(' ').replace(/\s+/g, ' ').trim();
}

/** Run only on this label's commit. No document-wide observer or recurring scan. */
export function connectFieldLabel(label: HTMLLabelElement): () => void {
  const target = associatedControl(label);
  if (!target || target.matches(choices) || label.closest('button,a')) return () => {};
  // These labels are the upload action itself, not a caption above a field.
  if (target.matches('input[type="file"]') && (label.contains(target) || label.classList.contains('cursor-pointer'))) return () => {};
  const name = labelText(label);
  if (!name) return () => {};
  const added: Array<[string, string]> = [];
  const add = (attribute: string, value: string) => {
    if (!target.hasAttribute(attribute)) {
      target.setAttribute(attribute, value);
      added.push([attribute, value]);
    }
  };
  if (!target.hasAttribute('aria-labelledby')) add('aria-label', name);
  add('title', name);
  return () => {
    for (const [attribute, value] of added) {
      if (target.getAttribute(attribute) === value) target.removeAttribute(attribute);
    }
  };
}
