const { ObjectId } = require("mongodb");
const Schema = require("./entity.schema");

let Entity;
const collName = "entities";

class EntityDAO {
  static async init(db) {
    const collList = await db
      .listCollections({ name: collName }, { nameOnly: true })
      .toArray();

    if (collList.length)
      await db.command({ collMod: collName, validator: Schema });
    else await db.createCollection(collName, { validator: Schema });

    if (!Entity) Entity = db.collection(collName);
  }

  static async add(props) {
    const { attrs, parent } = props;

    const parentEntity = parent
      ? await Entity.findOne(
          { _id: ObjectId(parent) },
          { projection: { path: 1 } }
        )
      : null;
    const path = parentEntity
      ? parentEntity.path
        ? parentEntity.path + "," + parent
        : parent
      : "";

  

    for (const [attrKey, attrValue] of Object.entries(attrs)) {
      if (attrValue.type === "alias")

      if (attrValue.type === "")
     
    }

    for (const attr in data) {
      attrsObj[attr] = {
        type: "data",
        value: data[attr],
      };
    }
    for (const attr in alias) {
      attrsObj[attr] = {
        type: "alias",
        target: alias[attr],
      };
    }
    for (const attr in link) {
      attrsObj[attr] = {
        type: "link",
        target: {
          entity: ObjectId(link[attr].entity),
          attr: link[attr].attr,
        },
      };
    }

    const newEntity = {
      path,
      parent: parent ? ObjectId(parent) : null,
      attrs: attrsObj,
    };
    const { insertedId } = await Entity.insertOne(newEntity);
    let result = { id: insertedId };
    for (const key in attrsObj) {
      const attr = attrsObj[key];
      result[key] =
        attr.type === "data"
          ? attr.value
          : attr.type === "link"
          ? "link"
          : attr.type === "alias"
          ? "alias"
          : "error";
    }

    return result;
  }

  // upsertOne
  static async upsertOne(props) {
    const { parent, data, alias, link, queries } = props;

    const parentEntity = parent
      ? await Entity.findOne(
          { _id: ObjectId(parent) },
          { projection: { path: 1 } }
        )
      : null;
    const path = parentEntity
      ? parentEntity.path
        ? parentEntity.path + "," + parent
        : parent
      : "";

    let setObj = {
      path,
      parent: parent ? ObjectId(parent) : null,
    };

    for (const attr in data) {
      setObj["attrs." + attr + ".type"] = "data";
      setObj["attrs." + attr + ".value"] = data[attr];
    }
    for (const attr in alias) {
      setObj["attrs." + attr] = {
        type: "alias",
        target: alias[attr],
      };
    }
    for (const attr in link) {
      setObj["attrs." + attr] = {
        type: "link",
        target: {
          entity: ObjectId(link[attr].entity),
          attr: link[attr].attr,
        },
      };
    }

    let queryObj = {};
    for (const key in queries) {
      queryObj[`attrs.${key}.value`] = queries[key];
    }
    const filter = {
      ...(parent && { parent: ObjectId(parent) }),
      ...queryObj,
    };
    const update = { $set: setObj };
    const options = { upsert: true };
    const {
      result,
      modifiedCount: mod,
      upsertedCount: ups,
      matchedCount: mat,
    } = await Entity.updateOne(filter, update, options);

    const ok = 1;
    const status =
      !mod && !ups && mat
        ? "unmodified"
        : mod && !ups && mat
        ? "modified"
        : !mod && ups && !mat
        ? "upserted"
        : "error";
    return { ok, status };
  }

  // getById
  static async getById(id, attrs) {
    const query = { _id: ObjectId(id) };
    const options = { projection: { attrs: 1, _id: 0 } };
    const entity = await Entity.findOne(query, options);
    if (!entity) return null;

    const attrsObj = entity.attrs;
    let result = {};
    if (attrs) {
      const attrsArr = Array.isArray(attrs) ? attrs : attrs.split(",");
      for (const key of attrsArr) {
        result[key] = await solveAttr(attrsObj, key);
      }
    } else
      for (const key in attrsObj) {
        const attr = attrsObj[key];
        result[key] =
          attr.type === "data"
            ? attr.value
            : attr.type === "link"
            ? "link"
            : attr.type === "alias"
            ? "alias"
            : attr.type === "expression"
            ? { expression: attr.expression, value: attr.value }
            : "error";
      }
    result.id = id;
    return result;
  }

  // getMany
  static async getMany({ ids, parent, ancestor, attrs, queries }) {
    let queryObj = {};
    for (const key in queries) {
      queryObj[`attrs.${key}.value`] = queries[key];
    }
    const query = {
      ...(ids && { _id: { $in: ObjectIdsArr(ids) } }),
      //  path = new RegExp(parent + "$");
      ...(parent && { parent: ObjectId(parent) }),
      ...(ancestor && { path: new RegExp(ancestor) }),
      ...queryObj,
    };

    const options = { projection: { attrs: 1 } };
    const entitiesArr = await Entity.find(query, options).toArray();
    return await Promise.all(
      entitiesArr.map(async (entity) => {
        const attrsObj = entity.attrs;
        let result = {};
        if (attrs) {
          const attrsArr = Array.isArray(attrs) ? attrs : attrs.split(",");
          for (const key of attrsArr) {
            result[key] = await solveAttr(attrsObj, key);
          }
        } else
          for (const key in attrsObj) {
            const attr = attrsObj[key];
            result[key] =
              attr.type === "data"
                ? attr.value
                : attr.type === "link"
                ? "link"
                : attr.type === "alias"
                ? "alias"
                : "error";
          }
        result.id = entity._id;
        return result;
      })
    );
  }

  // updateOne
  static async updateOne(props) {
    const {
      id,
      parent,
      ancestor,
      data,
      alias,
      link,
      expression,
      queries,
      timestamp,
    } = props;

    let setObj = {};
    let projectionObj = {};
    for (const attr in data) {
      setObj["attrs." + attr + ".type"] = "data";
      setObj["attrs." + attr + ".value"] = data[attr];
      projectionObj["attrs." + attr] = 1;
    }
    for (const attr in alias) {
      setObj["attrs." + attr] = { type: "alias", target: alias[attr] };
      projectionObj["attrs." + attr] = 1;
    }
    for (const attr in link) {
      setObj["attrs." + attr] = {
        type: "link",
        target: {
          entity: ObjectId(link[attr].entity),
          attr: link[attr].attr,
        },
      };
      projectionObj["attrs." + attr] = 1;
    }

    for (const attr in expression) {
      setObj["attrs." + attr] = {
        type: "expression",
        expression: expression[attr],
      };
    }

    let queryObj = {};
    for (const key in queries) {
      queryObj[`attrs.${key}.value`] = queries[key];
    }
    const filter = {
      ...(id && { _id: ObjectId(id) }),
      ...(parent && { parent: ObjectId(parent) }),
      ...(ancestor && { path: new RegExp(ancestor) }),
      ...queryObj,
    };
    const update = { $set: setObj };
    const options = { projection: projectionObj, returnOriginal: false };
    const result = await Entity.findOneAndUpdate(filter, update, options);

    console.log(result);

    return { ok: result.ok };
  }

  // deleteById
  static async deleteById(id) {
    const filter = { _id: ObjectId(id) };
    return (await Entity.deleteOne(filter)).result;
  }

  // deleteMany
  static async deleteMany({ ids, parent, ancestor, queries }) {
    let queryObj = {};
    for (const key in queries) {
      queryObj[`attrs.${key}.value`] = queries[key];
    }
    const filter = {
      ...(ids && { _id: { $in: ObjectIdsArr(ids) } }),
      ...(parent && { parent: ObjectId(parent) }),
      ...(ancestor && { path: new RegExp(ancestor) }),
      ...queryObj,
    };
    return (await Entity.deleteMany(filter)).result;
  }
}

// STATIC FUNCTIONS

async function solveAttr(attrsObj, key) {
  const attr = attrsObj[key];
  if (attr) {
    const type = attr.type;
    switch (type) {
      case "data":
        return attr.value;
      case "link":
        const id = attr.target.entity;
        const attr1 = attr.target.attr;
        const result = await EntityDAO.getById(id, attr1);
        return result[attr1];
      case "alias":
        return solveAttr(attrsObj, attr.target);
      default:
        throw new Error("type is strange");
    }
  } else return null;
}

function ObjectIdsArr(ids) {
  let idsArr = Array.isArray(ids) ? ids : ids.split(",");
  return idsArr.map((id) => ObjectId(id));
}

async function solveExpression(expr, arr) {
  let a = await EntityDAO.getById(arr[0].entity, arr[0].attr);
  let b = await EntityDAO.getById(arr[1].entity, arr[1].attr);
  if (expr === "add") return a[arr[0].attr] + b[arr[1].attr];
  else return 0;
}

module.exports = EntityDAO;
