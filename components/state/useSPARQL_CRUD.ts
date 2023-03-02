import {NamespaceBuilder} from '@rdfjs/namespace'
import {Bindings, Dataset, DatasetCore, Quad, ResultStream} from '@rdfjs/types'
import {ASK, CONSTRUCT, DELETE, INSERT} from '@tpluscode/sparql-builder'
import {JSONSchema7} from 'json-schema'
import jsonld from 'jsonld'
import N3 from 'n3'
import {useCallback, useEffect, useState} from 'react'

import {jsonSchemaGraphInfuser, WalkerOptions} from '../utils/graph/jsonSchemaGraphInfuser'
import {jsonSchema2construct} from '../utils/sparql'

export interface SparqlBuildOptions {
    base?: string;
    prefixes?: Record<string, string | NamespaceBuilder>;
}
export type CrudOptions = {
    updateFetch: (query: string) => Promise<ResultStream<any> | boolean | void | ResultStream<Bindings> | ResultStream<Quad>>
    constructFetch: (query: string) => Promise<DatasetCore>
    askFetch: (query: string) => Promise<boolean>
    defaultPrefix: string
    data: any
    setData: (data: any) => void
    walkerOptions?: Partial<WalkerOptions>
    queryBuildOptions?: SparqlBuildOptions
    upsertByDefault?: boolean
}

export const useSPARQL_CRUD = (entityIRI: string | undefined, typeIRI: string | undefined, schema: JSONSchema7,
                        {
                            askFetch,
                            constructFetch,
                            defaultPrefix,
                            updateFetch,
                            setData,
                            data,
                            walkerOptions = {},
                            queryBuildOptions,
                            upsertByDefault
                        }: CrudOptions) => {

    const [isUpdate, setIsUpdate] = useState(false)
    const [whereEntity, setWhereEntity] = useState<string | undefined>()

    useEffect(() => {
        if (!entityIRI) return
        const _whereEntity = ` <${entityIRI}> a <${typeIRI}> . `
        setWhereEntity(_whereEntity)
    }, [entityIRI, typeIRI, setWhereEntity])

    const exists = useCallback(async () => {
        if (!whereEntity) return false
        const query = ASK`${whereEntity}`.build(queryBuildOptions)
        try {
            return await askFetch(query)
        } catch (e) {
            console.log(e)
        }
        return false
    }, [whereEntity, setIsUpdate, defaultPrefix])

    const load = useCallback(
        async () => {
            if (!entityIRI || !whereEntity) return
            const {
                construct,
                whereRequired,
                whereOptionals
            } = jsonSchema2construct(entityIRI, schema, [], ['@id', '@type'])
            let query = CONSTRUCT`${construct}`.WHERE`
                ${whereEntity}
                ${whereRequired}
                ${whereOptionals}
                `.build(queryBuildOptions)
            query = `PREFIX : <${defaultPrefix}> ` + query
            try {
                const ds = await constructFetch(query)
                const resultJSON = jsonSchemaGraphInfuser(defaultPrefix, entityIRI, ds as Dataset, schema, walkerOptions)
                setIsUpdate(true)
                setData(resultJSON)
            } catch (e) {
                console.log(e)
            }
        },
        [entityIRI, whereEntity, setData, setIsUpdate, defaultPrefix],
    )

    const remove = useCallback(
        async () => {
            if (!entityIRI || !whereEntity) return
            const {
                construct,
                whereRequired,
                whereOptionals
            } = jsonSchema2construct(entityIRI, schema, ['@id'], ['@id', '@type'])
            let query = DELETE` ${construct} `.WHERE`${whereEntity} ${whereRequired}\n${whereOptionals}`.build(queryBuildOptions)
            query = `PREFIX : <${defaultPrefix}> ` + query
            console.log({query})
            const res = await updateFetch(query)
            console.log({res})
        },
        [entityIRI, whereEntity, defaultPrefix],
    )


    const save = useCallback(
        async () => {
            if (!data || !entityIRI || !whereEntity) return
            const ntWriter = new N3.Writer({format: 'Turtle'})
            const ds = await jsonld.toRDF(data)

            // @ts-ignore
            const ntriples = ntWriter.quadsToString([...ds]).replaceAll('_:_:', '_:')

            if (!isUpdate && !upsertByDefault) {
                const updateQuery = INSERT.DATA` ${ntriples} `
                const query = updateQuery.build()
                const res = await updateFetch(query)
                setIsUpdate(true)
            } else {
                const {
                    construct,
                    whereRequired,
                    whereOptionals
                } = jsonSchema2construct(entityIRI, schema, [], ['@id', '@type'])
                const queries = [
                    DELETE` ${construct} `.WHERE`${whereEntity} ${whereRequired}\n${whereOptionals}`.build(queryBuildOptions),
                    INSERT.DATA` ${ntriples} `.build(queryBuildOptions)
                ]
                for (let query of queries) {
                    query = `PREFIX : <${defaultPrefix}> ` + query
                    const res = await updateFetch(query)
                }
            }
        },
        [entityIRI, whereEntity, data, isUpdate, setIsUpdate, defaultPrefix])

    return {
        exists,
        load,
        save,
        remove,
        isUpdate,
        setIsUpdate
    }
}

