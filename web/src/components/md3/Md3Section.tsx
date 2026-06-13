import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import type { ReactNode } from 'react'

import { Md3Surface } from './Md3Surface'

interface Md3SectionProps {
  title: string
  children: ReactNode
}

export function Md3Section({ title, children }: Md3SectionProps) {
  return (
    <Stack spacing={1.5}>
      <Typography variant="subtitle1">
        {title}
      </Typography>
      <Md3Surface level="default" sx={{ p: 2 }}>
        {children}
      </Md3Surface>
    </Stack>
  )
}
