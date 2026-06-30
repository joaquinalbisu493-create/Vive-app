import { View, StyleSheet } from 'react-native';
// import { ImageBackground } from 'react-native'; // ORIGINAL — fondo aurora con blur

type Props = { children: React.ReactNode };

export function AppBg({ children }: Props) {
  // TEMPORAL — fondo sólido oscuro mientras se define el diseño visual final
  return <View style={styles.root}>{children}</View>;

  // ORIGINAL — descomentar para restaurar
  // return (
  //   <ImageBackground
  //     source={require('@/assets/bg-aurora.jpg')}
  //     style={styles.root}
  //     resizeMode="cover"
  //     blurRadius={18}
  //   >
  //     {children}
  //   </ImageBackground>
  // );
}

const styles = StyleSheet.create({
  root: { flex: 1, width: '100%', height: '100%', backgroundColor: '#0D0D0D' },
});
