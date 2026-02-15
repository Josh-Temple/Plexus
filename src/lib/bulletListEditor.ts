import type { KeyboardEvent, RefObject } from "react";

type BulletKeydownParams = {
  event: KeyboardEvent<HTMLTextAreaElement>;
  value: string;
  setValue: (next: string) => void;
  textareaRef?: RefObject<HTMLTextAreaElement | null>;
};

const BULLET_PATTERN = /^(\s*)([-*+])\s(.*)$/;
const INDENT_UNIT = "  ";

const moveCursor = (ref: RefObject<HTMLTextAreaElement | null> | undefined, position: number) => {
  requestAnimationFrame(() => {
    if (!ref?.current) return;
    ref.current.selectionStart = position;
    ref.current.selectionEnd = position;
  });
};

export const handleBulletListKeyDown = ({ event, value, setValue, textareaRef }: BulletKeydownParams): boolean => {
  const cursor = event.currentTarget.selectionStart;
  const lineStart = value.lastIndexOf("\n", cursor - 1) + 1;
  const nextBreak = value.indexOf("\n", cursor);
  const lineEnd = nextBreak === -1 ? value.length : nextBreak;
  const currentLine = value.slice(lineStart, lineEnd);
  const bulletMatch = currentLine.match(BULLET_PATTERN);

  if (event.key === "Enter" && bulletMatch) {
    event.preventDefault();
    const [, indent, marker, content] = bulletMatch;

    if (content.trim().length === 0) {
      const next = `${value.slice(0, lineStart)}${indent}${value.slice(lineEnd)}`;
      setValue(next);
      moveCursor(textareaRef, lineStart + indent.length);
      return true;
    }

    const insertion = `\n${indent}${marker} `;
    const next = `${value.slice(0, cursor)}${insertion}${value.slice(cursor)}`;
    setValue(next);
    moveCursor(textareaRef, cursor + insertion.length);
    return true;
  }

  if (event.key === "Tab" && bulletMatch) {
    event.preventDefault();
    const [, indent, marker, content] = bulletMatch;
    const nextIndent = event.shiftKey
      ? indent.startsWith(INDENT_UNIT)
        ? indent.slice(INDENT_UNIT.length)
        : indent.startsWith("\t")
          ? indent.slice(1)
          : indent
      : `${indent}${INDENT_UNIT}`;

    const nextLine = `${nextIndent}${marker} ${content}`;
    const next = `${value.slice(0, lineStart)}${nextLine}${value.slice(lineEnd)}`;
    setValue(next);

    const indentDelta = nextIndent.length - indent.length;
    const nextCursor = Math.max(lineStart, cursor + indentDelta);
    moveCursor(textareaRef, nextCursor);
    return true;
  }

  return false;
};
