import { AliasType, AnyObject, PactConfigType, XHRRequestAndResponse, RequestOptionType } from 'types'
import { formatAlias, writePact, getHeaderAllowlist } from './utils'

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Cypress {
    interface Chainable {
      usePactWait: (alias: AliasType) => Chainable
      usePactRequest: (option: AnyObject, alias: string) => Chainable
      usePactGet: (alias: string, pactConfig: PactConfigType) => Chainable
      setupPact: (consumerName: string, providerName: string) => Chainable<null>
      setupPactHeaderAllowlist:(headers: string[]) => Chainable<null>
    }
  }
}

const pactConfig: PactConfigType = {
  consumerName: 'customer',
  providerName: 'provider'
}

const setupPact = (consumerName: string, providerName: string) => {
  pactConfig['consumerName'] = consumerName
  pactConfig['providerName'] = providerName
}

let pactHeaderAllowlist: string[] = []
const setupPactHeaderAllowlist = (headerList: string[]) => {
  pactHeaderAllowlist = getHeaderAllowlist(headerList)
}

const usePactWait = (alias: AliasType) => {
  const formattedAlias = formatAlias(alias)
  const testCaseTitle = Cypress.currentTest.title
  //NOTE: spread only works for array containing more than one item
  if (formattedAlias.length > 1) {
    cy.wait([...formattedAlias]).spread((...intercepts) => {
      intercepts.forEach((intercept, index) => {
        writePact(intercept, `${testCaseTitle}-${formattedAlias[index]}`, pactConfig, pactHeaderAllowlist)
      })
    })
  } else {
    cy.wait(formattedAlias).then((intercept) => {
      const flattenIntercept = Array.isArray(intercept) ? intercept[0] : intercept
      writePact(flattenIntercept, `${testCaseTitle}`, pactConfig, pactHeaderAllowlist)
    })
  }
}

const requestDataMap: AnyObject = {}

const usePactGet = (alias: string) => {
  const formattedAlias = formatAlias(alias)
  const testCaseTitle = Cypress.currentTest.title
  formattedAlias.forEach((alias) => {
    cy.get(alias).then((response: any) => {
      const fullRequestAndResponse = {
        request: {
          method: requestDataMap[alias].method,
          url: requestDataMap[alias].url,
          headers: response.requestHeaders,
          body: response.requestBody
        },
        response: {
          body: response.body,
          statusCode: response.status,
          headers: response.headers,
          statusText: response.statusText
        }
      } as XHRRequestAndResponse
      writePact(fullRequestAndResponse, `${testCaseTitle}-${alias}`, pactConfig, pactHeaderAllowlist)
    })
  })
}

const usePactRequest = (option: Partial<RequestOptionType>, alias: string) => {
  cy.request(option).as(alias)
  // Store request url and method to a global item as cy.request.get() doesn't
  // provide related information
  requestDataMap[`@${alias}`] = option
}

Cypress.Commands.add('usePactWait', usePactWait)
Cypress.Commands.add('usePactRequest', usePactRequest)
Cypress.Commands.add('usePactGet', usePactGet)
Cypress.Commands.add('setupPact', setupPact)
Cypress.Commands.add('setupPactHeaderAllowlist', setupPactHeaderAllowlist)
