import { ThemeProvider } from '@mui/material/styles'
import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'

import { theme } from '@/theme/theme'

import { Md3Surface } from './Md3Surface'

afterEach(() => {
  cleanup()
})

describe('md3 surface', () => {
  it('renders content inside the MD3 theme', () => {
    render(
      <ThemeProvider theme={theme}>
        <Md3Surface data-testid="surface">content</Md3Surface>
      </ThemeProvider>,
    )

    expect(screen.getByTestId('surface')).toHaveTextContent('content')
  })

  it('supports glass surfaces', () => {
    render(
      <ThemeProvider theme={theme}>
        <Md3Surface data-testid="surface" glass>
          glass
        </Md3Surface>
      </ThemeProvider>,
    )

    expect(screen.getByTestId('surface')).toHaveTextContent('glass')
  })
})
