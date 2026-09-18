import { Navigate, Route, Routes } from 'react-router-dom'
import { ListScreen } from './screens/ListScreen'
import { DetailScreen } from './screens/DetailScreen'
import { CounterFormScreen } from './screens/CounterFormScreen'
import { SettingsScreen } from './screens/SettingsScreen'

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<ListScreen />} />
      <Route path="/new" element={<CounterFormScreen mode="new" />} />
      <Route path="/c/:id" element={<DetailScreen />} />
      <Route path="/c/:id/edit" element={<CounterFormScreen mode="edit" />} />
      <Route path="/settings" element={<SettingsScreen />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
