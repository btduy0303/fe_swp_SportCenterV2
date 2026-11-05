import { Dumbbell, Feather, Music, PersonStanding, Swords, Trophy, Waves } from 'lucide-react'

// Biểu tượng theo tên môn; môn mới chưa có trong danh sách dùng cúp
const CATEGORY_ICONS = [['bơi', Waves], ['boxing', Swords], ['cầu lông', Feather], ['yoga', PersonStanding], ['zumba', Music], ['gym', Dumbbell], ['fitness', Dumbbell]]

export const categoryIcon = (name = '') => CATEGORY_ICONS.find(([key]) => name.toLowerCase().includes(key))?.[1] || Trophy
