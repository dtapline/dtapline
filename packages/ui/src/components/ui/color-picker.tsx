import { cn } from "@/lib/utils"
import { Check, Palette } from "lucide-react"
import { useRef, useState } from "react"
import { HexColorPicker } from "react-colorful"
import { Input } from "./input"
import { Label } from "./label"
import { Popover, PopoverContent, PopoverTrigger } from "./popover"

// DTAP logo gradient colors - used for default environment colors
export const PRESET_COLORS = [
  { name: "Cyan", value: "#22D3EE" }, // Development
  { name: "Green", value: "#10B981" }, // Testing
  { name: "Yellow", value: "#F59E0B" }, // Acceptance
  { name: "Purple", value: "#8B5CF6" } // Production
]

interface ColorPickerProps {
  value: string
  onChange: (color: string) => void
  label?: string
  description?: string
}

export function ColorPicker({ description, label, onChange, value }: ColorPickerProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [inputValue, setInputValue] = useState(value)
  const inputRef = useRef<HTMLInputElement>(null)

  const handlePresetClick = (color: string) => {
    onChange(color)
    setInputValue(color)
    setIsOpen(false)
  }

  const handleInputChange = (newValue: string) => {
    setInputValue(newValue)
    // Validate hex color format before updating
    if (/^#[0-9A-Fa-f]{6}$/.test(newValue)) {
      onChange(newValue)
    }
  }

  const handleInputBlur = () => {
    // Reset to valid value if invalid
    if (!/^#[0-9A-Fa-f]{6}$/.test(inputValue)) {
      setInputValue(value)
    }
  }

  return (
    <div className="space-y-2">
      {label && <Label>{label}</Label>}
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <div
            className="flex w-full cursor-pointer items-center gap-2 rounded-md border border-input bg-transparent dark:bg-input/30 px-3 py-2 text-sm ring-offset-background hover:bg-accent hover:text-accent-foreground focus-within:outline-none focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2"
            onClick={() => {
              if (!isOpen) {
                setIsOpen(true)
              }
            }}
          >
            <div className="h-4 w-4 rounded border flex-shrink-0" style={{ backgroundColor: value }} />
            <Input
              ref={inputRef}
              value={inputValue}
              onChange={(e) => handleInputChange(e.target.value)}
              onBlur={handleInputBlur}
              placeholder="#3B82F6"
              maxLength={7}
              className="h-auto border-0 !bg-transparent dark:!bg-transparent p-0 text-left text-foreground uppercase shadow-none focus-visible:ring-0 focus-visible:ring-offset-0 flex-1"
              onClick={(e) => {
                e.stopPropagation()
              }}
            />
            <Palette className="h-4 w-4 text-muted-foreground flex-shrink-0" />
          </div>
        </PopoverTrigger>
        <PopoverContent className="w-64" align="start">
          <div className="space-y-3">
            <div>
              <p className="text-sm font-medium mb-2">Preset Colors</p>
              <div className="grid grid-cols-4 gap-2">
                {PRESET_COLORS.map((preset) => {
                  const isSelected = value.toLowerCase() === preset.value.toLowerCase()
                  return (
                    <button
                      key={preset.value}
                      type="button"
                      className={cn(
                        "relative h-10 w-full rounded border-2 transition-all hover:scale-105",
                        isSelected ? "border-primary ring-2 ring-primary ring-offset-2" : "border-transparent"
                      )}
                      style={{ backgroundColor: preset.value }}
                      onClick={() => handlePresetClick(preset.value)}
                      title={preset.name}
                    >
                      {isSelected && <Check className="absolute inset-0 m-auto h-5 w-5 text-white drop-shadow-md" />}
                    </button>
                  )
                })}
              </div>
              <div className="grid grid-cols-4 gap-2 mt-1 text-xs text-muted-foreground">
                {PRESET_COLORS.map((preset) => (
                  <div key={preset.value} className="text-center truncate">
                    {preset.name}
                  </div>
                ))}
              </div>
            </div>

            <div className="border-t pt-3">
              <p className="text-sm font-medium mb-2">Custom Color</p>
              <HexColorPicker color={value} onChange={onChange} style={{ width: "100%" }} />
            </div>
          </div>
        </PopoverContent>
      </Popover>
      {description && <p className="text-xs text-muted-foreground">{description}</p>}
    </div>
  )
}
