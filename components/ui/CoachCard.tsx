import type { ReactNode } from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';
import { SurfaceCard } from '@/components/ui/SurfaceCard';
import { ScaleCard } from '@/components/ScaleCard';

// Card del lado del profesional = SurfaceCard subtle (grano 3% + sombra cálida +
// borde olivo), igual que las cards del lado del usuario. Generaliza el patrón
// que primero vivió como `PCard` local en CoachProfile.
//
// El padding/layout va en `innerStyle` (SurfaceCard no padea su contenido) y el
// margen en `wrapStyle`. Si lleva `onPress`, se envuelve en ScaleCard (SurfaceCard
// subtle no es pulsable por sí solo).
const GLASS = 'rgba(255,248,240,0.55)';

export function CoachCard({
  wrapStyle,
  innerStyle,
  bg = GLASS,
  radius = 16,
  onPress,
  children,
}: {
  wrapStyle?: ViewStyle | ViewStyle[];
  innerStyle?: StyleProp<ViewStyle>;
  bg?: string;
  radius?: number;
  onPress?: () => void;
  children: ReactNode;
}) {
  const card = (
    <SurfaceCard variant="subtle" backgroundColor={bg} borderRadius={radius} style={onPress ? undefined : wrapStyle}>
      <View style={innerStyle}>{children}</View>
    </SurfaceCard>
  );
  if (!onPress) return card;
  return (
    <ScaleCard style={wrapStyle} onPress={onPress} activeOpacity={0.85}>
      {card}
    </ScaleCard>
  );
}
