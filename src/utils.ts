import {
  fetchUtils,
  DataProvider,
  GetOneParams,
  CreateParams,
  UpdateParams,
  GetManyParams,
  GetManyReferenceParams,
  DeleteParams,
  UpdateManyParams,
  DeleteManyParams,
  RaRecord,
  DeleteResult,
  DeleteManyResult,
} from "react-admin";

const apiUrl = "http://localhost:9000";
const httpClient = (url: string, options: RequestInit = {}) => {
  if (!options.headers) {
    options.headers = new Headers({ Accept: "application/json" });
  }

  const token = localStorage.getItem("token");
  if (token) {
    (options.headers as Headers).set("Authorization", `Bearer ${token}`);
  }

  return fetchUtils.fetchJson(url, options);
};

// Define a common type for your data structure
interface Patient {
  _id: string;
  id?: string;
  name: string;
  age: number;
}

const customDataProvider: DataProvider = {
  getList: async (resource, params) => {
    const { page, perPage } = params.pagination || { page: 1, perPage: 10 };
    const { field, order } = params.sort || { field: "id", order: "ASC" };

    const query = {
      _start: ((page - 1) * perPage).toString(),
      _end: (page * perPage).toString(),
      _sort: field,
      _order: order,
      ...params.filter, // Spread the filter object
      q: params.filter.q || "", // Ensure `q` is passed for search
    };

    const url = `${apiUrl}/${resource}?${new URLSearchParams(query)}`;
    const { headers, json } = await httpClient(url);

    return {
      data: json.map((record: { _id: unknown }) => ({
        ...record,
        id: record._id,
      })),
      total: parseInt(headers.get("X-Total-Count") || "0", 10), // Ensure `X-Total-Count` is read
    };
  },

  getOne: async (resource: string, params: GetOneParams) => {
    const url = `${apiUrl}/${resource}/${params.id}`;
    const { json } = await httpClient(url);
    return { data: { ...json, id: json._id } };
  },

  getMany: async (resource: string, params: GetManyParams) => {
    const ids = params.ids.join(",");
    const url = `${apiUrl}/${resource}?ids=${ids}`;
    const { json } = await httpClient(url);
    return {
      data: json.map((record: Patient) => ({ ...record, id: record._id })),
    };
  },

  getManyReference: async (
    resource: string,
    params: GetManyReferenceParams
  ) => {
    const url = `${apiUrl}/${resource}?${params.target}=${params.id}`;
    const { json } = await httpClient(url);
    return {
      data: json.map((record: Patient) => ({ ...record, id: record._id })),
      total: json.length,
    };
  },

  create: async (resource: string, params: CreateParams) => {
    const url = `${apiUrl}/${resource}`;
    const { json } = await httpClient(url, {
      method: "POST",
      body: JSON.stringify(params.data),
    });
    return { data: { ...json.data, id: json.data._id } };
  },

  update: async (resource: string, params: UpdateParams) => {
    const url = `${apiUrl}/${resource}/${params.id}`;
    const { json } = await httpClient(url, {
      method: "PUT",
      body: JSON.stringify(params.data),
    });
    return { data: { ...json, id: json._id } };
  },

  updateMany: async (_resource: string, params: UpdateManyParams) => {
    return { data: params.ids };
  },

  delete: async <RecordType extends RaRecord = RaRecord>(
    resource: string,
    params: DeleteParams<RecordType>
  ): Promise<DeleteResult<RecordType>> => {
    const url = `${apiUrl}/${resource}/${params.id}`;
    await httpClient(url, { method: "DELETE" });

    return {
      data: {
        id: params.id,
      } as RecordType,
    };
  },

  deleteMany: async <RecordType extends RaRecord = RaRecord>(
    resource: string,
    params: DeleteManyParams<RecordType>
  ): Promise<DeleteManyResult<RecordType>> => {
    await Promise.all(
      params.ids.map((id) =>
        httpClient(`${apiUrl}/${resource}/${id}`, { method: "DELETE" })
      )
    );

    return {
      data: params.ids as RecordType["id"][],
    };
  },
};

export default customDataProvider;
