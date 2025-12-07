import { z } from "zod"

export type FormState = "idle" | "submitting" | "success" | "error"

export interface FormResult<T> {
  success: boolean
  data?: T
  error?: string
  fieldErrors?: Record<string, string>
}

export interface ClientFormOptions<T extends z.ZodObject<any>, R = unknown> {
  /** Zod schema for validation */
  schema: T
  /** Async function to handle form submission (e.g., call Vendure API) */
  onSubmit: (data: z.infer<T>) => Promise<FormResult<R>>
  /** Called when form state changes */
  onStateChange?: (state: FormState) => void
  /** Called when validation or API errors occur */
  onError?: (errors: Record<string, string>, formError?: string) => void
  /** Called on successful submission */
  onSuccess?: (result: R) => void
  /** CSS class for error messages */
  errorClass?: string
  /** CSS class for form-level error */
  formErrorClass?: string
  /** CSS class for success message */
  successClass?: string
  /** Custom error messages */
  messages?: {
    networkError?: string
    success?: string
  }
}

/**
 * Creates a client-side form handler with Zod validation
 * Framework-agnostic, works with vanilla HTML forms
 */
export function createClientForm<T extends z.ZodObject<any>, R = unknown>(
  formElement: HTMLFormElement | string,
  options: ClientFormOptions<T, R>
) {
  const form = typeof formElement === "string" 
    ? document.getElementById(formElement) as HTMLFormElement 
    : formElement

  if (!form) {
    console.error(`Form not found: ${formElement}`)
    return null
  }

  const {
    schema,
    onSubmit,
    onStateChange,
    onError,
    onSuccess,
    errorClass = "field-error text-red-500 text-sm",
    formErrorClass = "form-error text-red-500 mb-2",
    successClass = "form-success text-green-500 mb-2",
    messages = {}
  } = options

  const { networkError = "Network error. Please try again.", success: successMessage } = messages

  let currentState: FormState = "idle"

  function setState(state: FormState) {
    currentState = state
    onStateChange?.(state)
    updateSubmitButton()
  }

  function updateSubmitButton() {
    const submitBtn = form.querySelector('[type="submit"]') as HTMLButtonElement
    if (submitBtn) {
      submitBtn.disabled = currentState === "submitting"
      if (currentState === "submitting") {
        submitBtn.dataset.originalText = submitBtn.textContent || ""
        submitBtn.textContent = "Submitting..."
      } else if (submitBtn.dataset.originalText) {
        submitBtn.textContent = submitBtn.dataset.originalText
      }
    }
  }

  function clearErrors() {
    form.querySelectorAll(`.${errorClass.split(" ")[0]}`).forEach((el) => el.remove())
    form.querySelector(`.${formErrorClass.split(" ")[0]}`)?.remove()
    form.querySelector(`.${successClass.split(" ")[0]}`)?.remove()
    
    // Remove error styling from inputs
    form.querySelectorAll("[data-has-error]").forEach((el) => {
      el.removeAttribute("data-has-error")
    })
  }

  function displayFieldError(fieldName: string, message: string) {
    const input = form.querySelector(`[name="${fieldName}"]`) as HTMLElement
    if (input) {
      input.setAttribute("data-has-error", "true")
      const errorEl = document.createElement("span")
      errorEl.className = errorClass
      errorEl.setAttribute("data-field-error", fieldName)
      errorEl.textContent = message
      input.parentElement?.appendChild(errorEl)
    }
  }

  function displayFieldErrors(errors: Record<string, string>) {
    for (const [field, message] of Object.entries(errors)) {
      displayFieldError(field, message)
    }
    onError?.(errors)
  }

  function displayFormError(message: string) {
    const errorEl = document.createElement("div")
    errorEl.className = formErrorClass
    errorEl.textContent = message
    form.prepend(errorEl)
    onError?.({}, message)
  }

  function displaySuccess(message?: string) {
    if (!message) return
    const successEl = document.createElement("div")
    successEl.className = successClass
    successEl.textContent = message
    form.prepend(successEl)
  }

  function getFormData(): Record<string, unknown> {
    const formData = new FormData(form)
    const data: Record<string, unknown> = {}

    for (const [key, value] of formData.entries()) {
      // Handle nested fields (e.g., "country.countryCode")
      if (key.includes(".")) {
        const parts = key.split(".")
        let current = data
        for (let i = 0; i < parts.length - 1; i++) {
          current[parts[i]] = current[parts[i]] || {}
          current = current[parts[i]] as Record<string, unknown>
        }
        current[parts[parts.length - 1]] = value
      } else {
        data[key] = value
      }
    }

    return data
  }

  async function handleSubmit(e: SubmitEvent) {
    e.preventDefault()
    clearErrors()
    setState("submitting")

    const rawData = getFormData()

    // Validate with Zod
    const result = schema.safeParse(rawData)

    if (!result.success) {
      const fieldErrors: Record<string, string> = {}
      for (const issue of result.error.issues) {
        const path = issue.path.join(".")
        if (!fieldErrors[path]) {
          fieldErrors[path] = issue.message
        }
      }
      displayFieldErrors(fieldErrors)
      setState("error")
      return
    }

    // Call API
    try {
      const response = await onSubmit(result.data)

      if (!response.success) {
        if (response.fieldErrors) {
          displayFieldErrors(response.fieldErrors)
        }
        if (response.error) {
          displayFormError(response.error)
        }
        setState("error")
        return
      }

      setState("success")
      displaySuccess(successMessage)
      onSuccess?.(response.data as R)
    } catch (err) {
      console.error("Form submission error:", err)
      displayFormError(networkError)
      setState("error")
    }
  }

  // Attach event listener
  form.addEventListener("submit", handleSubmit)

  // Return control object
  return {
    /** Current form state */
    get state() {
      return currentState
    },
    /** Manually clear all errors */
    clearErrors,
    /** Manually display a field error */
    displayFieldError,
    /** Manually display a form-level error */
    displayFormError,
    /** Manually trigger form submission */
    submit: () => form.requestSubmit(),
    /** Reset the form */
    reset: () => {
      clearErrors()
      form.reset()
      setState("idle")
    },
    /** Destroy the form handler (remove event listeners) */
    destroy: () => {
      form.removeEventListener("submit", handleSubmit)
    },
  }
}

export interface FormSectionOptions<T extends z.ZodObject<any>, R = unknown> 
  extends Omit<ClientFormOptions<T, R>, 'onSuccess'> {
  /** Render the committed data as HTML */
  renderCommitted: (data: z.infer<T>) => string
  /** Called on successful submission (after view switches) */
  onSuccess?: (result: R, data: z.infer<T>) => void
  /** CSS class for the committed view container */
  viewClass?: string
  /** CSS class for the edit button */
  editButtonClass?: string
  /** Label for the edit button */
  editButtonLabel?: string
}

/**
 * Creates a form section with view/edit toggle
 * - After successful submit, shows committed data as read-only view
 * - "Edit" button switches back to form mode with pre-populated data
 */
export function createFormSection<T extends z.ZodObject<any>, R = unknown>(
  formElement: HTMLFormElement | string,
  options: FormSectionOptions<T, R>
) {
  const form = typeof formElement === "string"
    ? document.getElementById(formElement) as HTMLFormElement
    : formElement

  if (!form) {
    console.error(`Form not found: ${formElement}`)
    return null
  }

  const {
    renderCommitted,
    onSuccess,
    viewClass = "committed-view",
    editButtonClass = "edit-btn mt-2 cursor-pointer border px-3 py-1",
    editButtonLabel = "Edit",
    ...formOptions
  } = options

  const container = form.parentElement
  if (!container) {
    console.error("Form must have a parent element")
    return null
  }

  // Create view element (hidden initially)
  const viewEl = document.createElement("div")
  viewEl.className = `${viewClass} hidden`
  viewEl.setAttribute("data-view-for", form.id)
  container.insertBefore(viewEl, form)

  // Track committed data
  let committedData: z.infer<T> | null = null

  // Populate form fields with data
  function populateForm(data: Record<string, any>) {
    for (const [key, value] of Object.entries(data)) {
      const field = form.elements.namedItem(key) as HTMLInputElement | HTMLSelectElement | null
      if (field) {
        if (field.type === "checkbox") {
          (field as HTMLInputElement).checked = Boolean(value)
        } else {
          field.value = value?.toString() ?? ""
        }
      }
    }
  }

  // Switch to view mode
  function showCommittedView(data: z.infer<T>) {
    committedData = data
    viewEl.innerHTML = `
      <div class="committed-content bg-gray-50 p-4 rounded">
        ${renderCommitted(data)}
      </div>
      <button type="button" class="${editButtonClass}">
        ${editButtonLabel}
      </button>
    `
    viewEl.classList.remove("hidden")
    form.classList.add("hidden")

    // Attach edit handler
    viewEl.querySelector(".edit-btn")?.addEventListener("click", showEditMode)
  }

  // Switch to edit mode
  function showEditMode() {
    viewEl.classList.add("hidden")
    form.classList.remove("hidden")

    // Populate form with committed data
    if (committedData) {
      populateForm(committedData)
    }
  }

  // Create the underlying form handler with custom onSuccess
  const formControl = createClientForm(form, {
    ...formOptions,
    onSuccess: (result) => {
      // Get current form data to show in view
      const formData = new FormData(form)
      const data: Record<string, unknown> = {}
      for (const [key, value] of formData.entries()) {
        data[key] = value
      }
      const parsedData = formOptions.schema.parse(data)
      
      showCommittedView(parsedData)
      onSuccess?.(result, parsedData)
    },
  })

  return {
    ...formControl,
    /** Show the committed view with given data */
    showCommittedView,
    /** Switch to edit mode */
    showEditMode,
    /** Get the current committed data */
    getCommittedData: () => committedData,
    /** Set initial data and show as committed */
    setInitialData: (data: z.infer<T>) => {
      populateForm(data)
      showCommittedView(data)
    },
    /** Check if data has been committed */
    isCommitted: () => committedData !== null,
  }
}

/**
 * Helper to create a Vendure API handler
 */
export function createVendureSubmitHandler<T, R>(
  mutation: string,
  options: {
    endpoint?: string
    mapInput?: (data: T) => Record<string, unknown>
    mapResponse?: (data: any) => R
    getErrorMessage?: (errors: any[]) => string
  } = {}
) {
  const {
    endpoint = "/api/graphql",
    mapInput = (data) => data as Record<string, unknown>,
    mapResponse = (data) => data as R,
    getErrorMessage = (errors) => errors[0]?.message || "An error occurred",
  } = options

  return async (data: T): Promise<FormResult<R>> => {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include",
      body: JSON.stringify({
        query: mutation,
        variables: { input: mapInput(data) },
      }),
    })

    const json = await response.json()

    if (json.errors) {
      return {
        success: false,
        error: getErrorMessage(json.errors),
      }
    }

    // Check for Vendure ErrorResult types
    const resultData = Object.values(json.data || {})[0] as any
    if (resultData?.__typename?.includes("Error")) {
      return {
        success: false,
        error: resultData.message || resultData.errorCode,
      }
    }

    return {
      success: true,
      data: mapResponse(resultData),
    }
  }
}
