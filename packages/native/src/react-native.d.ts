/**
 * Minimal ambient declarations for the React Native primitives this package
 * uses. `react-native` is a *peer dependency* — the host app provides the real
 * implementation and full types. This shim lets `@mitumba/pay-native` typecheck
 * and emit its own `.d.ts` without installing the entire RN toolchain at build
 * time. It intentionally declares only what MitumbaPaySheet.tsx references.
 *
 * When the consuming app installs react-native, its richer types take
 * precedence at the app's type-checking boundary.
 */
declare module 'react-native' {
  import type { ComponentType, ReactNode } from 'react'

  export interface GestureResponderEvent {
    stopPropagation(): void
    preventDefault(): void
  }

  export type NamedStyle = Record<string, unknown>
  export type StyleValue = NamedStyle | NamedStyle[] | false | null | undefined | StyleValue[]

  export interface ViewProps {
    style?: StyleValue
    children?: ReactNode
    accessibilityRole?: string
    accessibilityState?: { busy?: boolean; disabled?: boolean }
    accessibilityLiveRegion?: 'none' | 'polite' | 'assertive'
  }

  export interface PressableProps extends ViewProps {
    onPress?: (event: GestureResponderEvent) => void
    disabled?: boolean
  }

  export type TextProps = ViewProps

  export interface ModalProps {
    visible?: boolean
    transparent?: boolean
    animationType?: 'none' | 'slide' | 'fade'
    onRequestClose?: () => void
    children?: ReactNode
  }

  export interface ActivityIndicatorProps {
    color?: string
    size?: 'small' | 'large' | number
  }

  export const View: ComponentType<ViewProps>
  export const Text: ComponentType<TextProps>
  export const Pressable: ComponentType<PressableProps>
  export const Modal: ComponentType<ModalProps>
  export const ActivityIndicator: ComponentType<ActivityIndicatorProps>

  export const StyleSheet: {
    create<T extends Record<string, StyleValue>>(styles: T): T
  }
}
