"use client";

import { type ComponentType } from "react";
import {
  EditorContent,
  type Editor,
  useEditor,
  useEditorState,
} from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { Heading } from "@tiptap/extension-heading";
import { mergeAttributes } from "@tiptap/core";
import Underline from "@tiptap/extension-underline";
import Link from "@tiptap/extension-link";
import TextAlign from "@tiptap/extension-text-align";
import Placeholder from "@tiptap/extension-placeholder";
import {
  AlignCenter,
  AlignJustify,
  AlignLeft,
  AlignRight,
  Bold,
  Eraser,
  Heading1,
  Heading2,
  Heading3,
  IndentDecrease,
  IndentIncrease,
  Italic,
  Link2,
  List,
  ListOrdered,
  Minus,
  Pilcrow,
  Quote,
  Redo2,
  Strikethrough,
  Underline as UnderlineIcon,
  Undo2,
  Unlink,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

type RichTextEditorProps = {
  initialHtml: string;
  placeholder?: string;
  ariaLabel?: string;
  className?: string;
  onReady?: (editor: Editor) => void;
};

const HEADING_CLASSES: Record<number, string> = {
  1: "mt-4 mb-2 text-2xl font-semibold leading-tight tracking-tight",
  2: "mt-4 mb-2 text-xl font-semibold leading-snug tracking-tight",
  3: "mt-3 mb-2 text-lg font-semibold leading-snug",
};

const CustomHeading = Heading.extend({
  renderHTML({ node, HTMLAttributes }) {
    const rawLevel = node.attrs.level as number;
    const level: 1 | 2 | 3 =
      rawLevel === 1 || rawLevel === 2 || rawLevel === 3 ? rawLevel : 3;
    return [
      `h${level}`,
      mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, {
        class: HEADING_CLASSES[level],
      }),
      0,
    ];
  },
});

export function RichTextEditor({
  initialHtml,
  placeholder = "",
  ariaLabel,
  className,
  onReady,
}: RichTextEditorProps) {
  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        heading: false,
        codeBlock: false,
        blockquote: {
          HTMLAttributes: {
            class:
              "my-3 border-l-2 border-border pl-3 italic text-muted-foreground",
          },
        },
        bulletList: {
          HTMLAttributes: { class: "my-2 list-disc pl-6" },
        },
        orderedList: {
          HTMLAttributes: { class: "my-2 list-decimal pl-6" },
        },
        horizontalRule: {
          HTMLAttributes: { class: "my-4 border-border" },
        },
      }),
      CustomHeading.configure({ levels: [1, 2, 3] }),
      Underline,
      Link.configure({
        openOnClick: false,
        autolink: true,
        linkOnPaste: true,
        HTMLAttributes: {
          class: "text-blue-600 underline underline-offset-2",
          rel: "noopener noreferrer",
        },
      }),
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      Placeholder.configure({ placeholder }),
    ],
    content: initialHtml || "",
    editorProps: {
      attributes: {
        class: cn(
          "tiptap ProseMirror",
          "min-h-[320px] rounded-lg border border-border bg-background px-4 py-3",
          "text-sm leading-6 text-foreground shadow-xs outline-none transition",
          "focus:border-ring focus:ring-[3px] focus:ring-ring/20",
        ),
        role: "textbox",
        ...(ariaLabel ? { "aria-label": ariaLabel } : {}),
      },
    },
    onCreate: ({ editor }) => {
      onReady?.(editor);
    },
  });

  return (
    <div className={cn("space-y-2", className)}>
      <RichTextEditorToolbar editor={editor} />
      <EditorContent editor={editor} />
    </div>
  );
}

type BlockFormat = "paragraph" | "h1" | "h2" | "h3" | "blockquote";

type ToolbarState = {
  currentFormat: BlockFormat;
  isBold: boolean;
  isItalic: boolean;
  isUnderline: boolean;
  isStrike: boolean;
  isBulletList: boolean;
  isOrderedList: boolean;
  isAlignLeft: boolean;
  isAlignCenter: boolean;
  isAlignRight: boolean;
  isAlignJustify: boolean;
  isLink: boolean;
  canUndo: boolean;
  canRedo: boolean;
};

const DEFAULT_TOOLBAR_STATE: ToolbarState = {
  currentFormat: "paragraph",
  isBold: false,
  isItalic: false,
  isUnderline: false,
  isStrike: false,
  isBulletList: false,
  isOrderedList: false,
  isAlignLeft: false,
  isAlignCenter: false,
  isAlignRight: false,
  isAlignJustify: false,
  isLink: false,
  canUndo: false,
  canRedo: false,
};

function RichTextEditorToolbar({ editor }: { editor: Editor | null }) {
  const state =
    useEditorState({
      editor,
      selector: ({ editor }): ToolbarState => {
        if (!editor) return DEFAULT_TOOLBAR_STATE;
        const currentFormat: BlockFormat = editor.isActive("heading", {
          level: 1,
        })
          ? "h1"
          : editor.isActive("heading", { level: 2 })
            ? "h2"
            : editor.isActive("heading", { level: 3 })
              ? "h3"
              : editor.isActive("blockquote")
                ? "blockquote"
                : "paragraph";
        return {
          currentFormat,
          isBold: editor.isActive("bold"),
          isItalic: editor.isActive("italic"),
          isUnderline: editor.isActive("underline"),
          isStrike: editor.isActive("strike"),
          isBulletList: editor.isActive("bulletList"),
          isOrderedList: editor.isActive("orderedList"),
          isAlignLeft: editor.isActive({ textAlign: "left" }),
          isAlignCenter: editor.isActive({ textAlign: "center" }),
          isAlignRight: editor.isActive({ textAlign: "right" }),
          isAlignJustify: editor.isActive({ textAlign: "justify" }),
          isLink: editor.isActive("link"),
          canUndo: editor.can().undo(),
          canRedo: editor.can().redo(),
        };
      },
    }) ?? DEFAULT_TOOLBAR_STATE;

  const disabled = !editor;

  const applyBlockFormat = (value: string) => {
    if (!editor) return;
    const chain = editor.chain().focus();
    switch (value) {
      case "h1":
        chain.setHeading({ level: 1 }).run();
        return;
      case "h2":
        chain.setHeading({ level: 2 }).run();
        return;
      case "h3":
        chain.setHeading({ level: 3 }).run();
        return;
      case "blockquote":
        if (editor.isActive("blockquote")) {
          chain.lift("blockquote").run();
        } else {
          chain.setParagraph().setBlockquote().run();
        }
        return;
      default:
        if (editor.isActive("blockquote")) {
          chain.lift("blockquote").setParagraph().run();
        } else {
          chain.setParagraph().run();
        }
    }
  };

  const openLinkPrompt = () => {
    if (!editor) return;
    const previousUrl = editor.getAttributes("link").href as string | undefined;
    const url = window.prompt("Link-URL eingeben", previousUrl ?? "");
    if (url === null) return;
    if (url.trim() === "") {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
      return;
    }
    const normalized = /^https?:\/\//i.test(url.trim())
      ? url.trim()
      : `https://${url.trim()}`;
    editor
      .chain()
      .focus()
      .extendMarkRange("link")
      .setLink({ href: normalized })
      .run();
  };

  return (
    <div className="flex flex-wrap items-center gap-1 rounded-lg border border-border bg-muted/20 p-2">
      <Select
        value={state.currentFormat}
        onValueChange={applyBlockFormat}
        disabled={disabled}
      >
        <SelectTrigger
          className="h-8 w-[156px] bg-background text-xs"
          aria-label="Textformat"
        >
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="paragraph">
            <span className="inline-flex items-center gap-2">
              <Pilcrow className="size-3.5" aria-hidden />
              Absatz
            </span>
          </SelectItem>
          <SelectItem value="h1">
            <span className="inline-flex items-center gap-2">
              <Heading1 className="size-3.5" aria-hidden />
              Überschrift 1
            </span>
          </SelectItem>
          <SelectItem value="h2">
            <span className="inline-flex items-center gap-2">
              <Heading2 className="size-3.5" aria-hidden />
              Überschrift 2
            </span>
          </SelectItem>
          <SelectItem value="h3">
            <span className="inline-flex items-center gap-2">
              <Heading3 className="size-3.5" aria-hidden />
              Überschrift 3
            </span>
          </SelectItem>
          <SelectItem value="blockquote">
            <span className="inline-flex items-center gap-2">
              <Quote className="size-3.5" aria-hidden />
              Zitat
            </span>
          </SelectItem>
        </SelectContent>
      </Select>

      <ToolbarDivider />
      <ToolbarToggleButton
        label="Fett"
        icon={Bold}
        active={state.isBold}
        disabled={disabled}
        onRun={() => editor?.chain().focus().toggleBold().run()}
      />
      <ToolbarToggleButton
        label="Kursiv"
        icon={Italic}
        active={state.isItalic}
        disabled={disabled}
        onRun={() => editor?.chain().focus().toggleItalic().run()}
      />
      <ToolbarToggleButton
        label="Unterstreichen"
        icon={UnderlineIcon}
        active={state.isUnderline}
        disabled={disabled}
        onRun={() => editor?.chain().focus().toggleUnderline().run()}
      />
      <ToolbarToggleButton
        label="Durchstreichen"
        icon={Strikethrough}
        active={state.isStrike}
        disabled={disabled}
        onRun={() => editor?.chain().focus().toggleStrike().run()}
      />

      <ToolbarDivider />
      <ToolbarToggleButton
        label="Aufzählung"
        icon={List}
        active={state.isBulletList}
        disabled={disabled}
        onRun={() => editor?.chain().focus().toggleBulletList().run()}
      />
      <ToolbarToggleButton
        label="Nummerierung"
        icon={ListOrdered}
        active={state.isOrderedList}
        disabled={disabled}
        onRun={() => editor?.chain().focus().toggleOrderedList().run()}
      />
      <ToolbarToggleButton
        label="Einzug verringern"
        icon={IndentDecrease}
        disabled={disabled}
        onRun={() => editor?.chain().focus().liftListItem("listItem").run()}
      />
      <ToolbarToggleButton
        label="Einzug erhöhen"
        icon={IndentIncrease}
        disabled={disabled}
        onRun={() => editor?.chain().focus().sinkListItem("listItem").run()}
      />

      <ToolbarDivider />
      <ToolbarToggleButton
        label="Linksbündig"
        icon={AlignLeft}
        active={state.isAlignLeft}
        disabled={disabled}
        onRun={() => editor?.chain().focus().setTextAlign("left").run()}
      />
      <ToolbarToggleButton
        label="Zentriert"
        icon={AlignCenter}
        active={state.isAlignCenter}
        disabled={disabled}
        onRun={() => editor?.chain().focus().setTextAlign("center").run()}
      />
      <ToolbarToggleButton
        label="Rechtsbündig"
        icon={AlignRight}
        active={state.isAlignRight}
        disabled={disabled}
        onRun={() => editor?.chain().focus().setTextAlign("right").run()}
      />
      <ToolbarToggleButton
        label="Blocksatz"
        icon={AlignJustify}
        active={state.isAlignJustify}
        disabled={disabled}
        onRun={() => editor?.chain().focus().setTextAlign("justify").run()}
      />

      <ToolbarDivider />
      <ToolbarToggleButton
        label="Link setzen"
        icon={Link2}
        active={state.isLink}
        disabled={disabled}
        onRun={openLinkPrompt}
      />
      <ToolbarToggleButton
        label="Link entfernen"
        icon={Unlink}
        disabled={disabled || !state.isLink}
        onRun={() => editor?.chain().focus().unsetLink().run()}
      />
      <ToolbarToggleButton
        label="Trennlinie"
        icon={Minus}
        disabled={disabled}
        onRun={() => editor?.chain().focus().setHorizontalRule().run()}
      />

      <ToolbarDivider />
      <ToolbarToggleButton
        label="Rückgängig"
        icon={Undo2}
        disabled={disabled || !state.canUndo}
        onRun={() => editor?.chain().focus().undo().run()}
      />
      <ToolbarToggleButton
        label="Wiederholen"
        icon={Redo2}
        disabled={disabled || !state.canRedo}
        onRun={() => editor?.chain().focus().redo().run()}
      />
      <ToolbarToggleButton
        label="Formatierung entfernen"
        icon={Eraser}
        disabled={disabled}
        onRun={() =>
          editor?.chain().focus().unsetAllMarks().clearNodes().run()
        }
      />
    </div>
  );
}

function ToolbarToggleButton({
  label,
  icon: Icon,
  active = false,
  disabled = false,
  onRun,
}: {
  label: string;
  icon: ComponentType<{ className?: string }>;
  active?: boolean;
  disabled?: boolean;
  onRun: () => void;
}) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      className={cn(
        "h-8 gap-1.5 px-2",
        active && "bg-muted text-foreground shadow-xs",
      )}
      aria-pressed={active}
      aria-label={label}
      title={label}
      disabled={disabled}
      onMouseDown={(event) => {
        event.preventDefault();
        onRun();
      }}
    >
      <Icon className="size-4" aria-hidden />
    </Button>
  );
}

function ToolbarDivider() {
  return <span className="mx-1 h-6 w-px bg-border" aria-hidden />;
}
