# OpenAPI generator for express API
POC to generate swagger docs for express API written in typescript.

# Demo
There is a sample express app in `sample` directory.
The generated output is save in `openapi.json` file.

To test the generated file:
- Go to [Swagger Editor](https://editor.swagger.io)
- Click File -> Import URL
- Paste in `https://raw.githubusercontent.com/nerijusdu/swagger-generator/master/sample/openapi.json`

# Running locally
- Clone repo
- `npm i`
- `npm start` (generates for sample app)

# TODO
- [X] handle request body type
- [X] handle response type
- [X] move types to definitions
- [X] handle query params
- [X] handle path params
- [X] handle response status
- [X] handle multiple types (oneOf)
- [X] handle arrays
- [X] Type in a type without a name e.g. type T = { a: { b: string } }
- [X] handle nested routes e.g. app.use('/api', router);
- [X] handle nested routes for duplicated routers e.g. app.use('/api', router); app.use('/api/v2/', router);
- [X] handle nested routes in routers e.g. router.use('/api', router2)
- [X] handle enums
- [X] handle generics (PaginatedList<T>)
- [X] handle inline route types (router.get<{ id: number }>)
- [X] handle type joins (&)
- [X] assign generated names for Pick/Omit
- [X] handle deep nested routers (with merged parameters)
- [ ] generate descriptions for responses
- [ ] test if type arrangement for IRequestMatcher is always the same
