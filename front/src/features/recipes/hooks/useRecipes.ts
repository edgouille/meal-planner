import { useEffect, useState } from 'react'
import { ApiError } from '../../../shared/api/api-error.ts'
import { listRecipes } from '../api/recipes.api.ts'
import type { RecipeListResponse } from '../recipes.types.ts'

type LoadState = { status: 'loading' } | { status: 'error'; message: string } | { status: 'ready'; response: RecipeListResponse }

export function useRecipes() {
  const [load, setLoad] = useState<LoadState>({ status: 'loading' })
  const [page, setPage] = useState(1)
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    const controller = new AbortController()
    setLoad({ status: 'loading' })
    listRecipes(page, controller.signal).then(
      response => {
        if (!controller.signal.aborted) setLoad({ status: 'ready', response })
      },
      (error: unknown) => {
        if (controller.signal.aborted || (error instanceof ApiError && error.status === 401)) return
        setLoad({ status: 'error', message: error instanceof ApiError && error.status === 0
          ? 'Impossible de joindre le serveur. Vérifiez votre connexion puis réessayez.'
          : 'Vos recettes n’ont pas pu être chargées. Veuillez réessayer.' })
      },
    )
    return () => controller.abort()
  }, [page, attempt])

  return { load, page, changePage: setPage, retry: () => setAttempt(value => value + 1) }
}
