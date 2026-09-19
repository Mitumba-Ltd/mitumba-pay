/**
 * Minimal ambient declarations for the React Native primitives this package
 * uses. `react-native` is a peer dependency; the host provides the real runtime
 * and full types. This keeps the package build independent of a full RN install.
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
    accessibilityLabel?: string
    accessibilityState?: { busy?: boolean; disabled?: boolean; selected?: boolean }
    accessibilityLiveRegion?: 'none' | 'polite' | 'assertive'
  }

  export interface PressableProps extends ViewProps {
    onPress?: (event: GestureResponderEvent) => void
    disabled?: boolean
  }

  export type TextProps = ViewProps

  export interface TextInputProps extends ViewProps {
    value?: string
    onChangeText?: (value: string) => void
    placeholder?: string
    placeholderTextColor?: string
    keyboardType?: 'default' | 'phone-pad' | 'number-pad' | 'email-address'
    autoComplete?: string
    editable?: boolean
  }

  export interface ScrollViewProps extends ViewProps {
    contentContainerStyle?: StyleValue
    bounces?: boolean
    showsVerticalScrollIndicator?: boolean
  }

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
  export const TextInput: ComponentType<TextInputProps>
  export const ScrollView: ComponentType<ScrollViewProps>
  export const Pressable: ComponentType<PressableProps>
  export const Modal: ComponentType<ModalProps>
  export const ActivityIndicator: ComponentType<ActivityIndicatorProps>

  export const StyleSheet: {
    create<T extends Record<string, StyleValue>>(styles: T): T
    absoluteFillObject: NamedStyle
  }
}
