# Default login screen — issue #26

Open `/?screen=login` or `/?screen=login&state=default`.

The standalone screen uses the shared light appearance, with the application name centered above Username, Password and Sign In. Fields are readonly and the button is disabled. No form, authentication request, validation, loading, login-error or redirect is implemented.

Legacy state URLs (`validation-error`, `loading`, `login-error`) render the default screen through the preview registry's normal fallback. The page has no application navigation or signed-in global header.
