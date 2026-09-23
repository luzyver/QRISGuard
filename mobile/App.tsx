import React from 'react';
import {SafeAreaProvider} from 'react-native-safe-area-context';
import PermissionStatusScreen from './src/screens/PermissionStatusScreen';

function App(): React.JSX.Element {
  return (
    <SafeAreaProvider>
      <PermissionStatusScreen />
    </SafeAreaProvider>
  );
}

export default App;
