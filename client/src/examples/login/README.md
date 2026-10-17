# Login UI — issue #26

Open these URLs on the Vite development server:

- /?screen=login&state=default
- /?screen=login&state=validation-error
- /?screen=login&state=loading
- /?screen=login&state=login-error

LoginPage is standalone and accepts the fixed state through ExampleProps.
Fields are readonly. There is no form submission, credential validation,
authentication request, session handling or redirect.
