const { ObjectId } = require("mongodb");
const commandSchema = require("../schemas/command.schema");

let Command;
const collName = "command";

class CommandDAO {
  static async init(db) {
    let collList = await db
      .listCollections({ name: collName }, { nameOnly: true })
      .toArray();
    if (collList.length)
      await db.command({ collMod: collName, validator: commandSchema });
    else await db.createCollection(collName, { validator: commandSchema });
    if (!Command) Command = db.collection(collName);
  }

  static async create(commandData) {
    try {
      let result = await Command.insertOne(commandData);
      if (result.acknowledged) {
        return { ...commandData, id: result.insertedId };
      } else throw new Error("insertOne error");
    } catch (error) {
      throw error;
    }
  }

  static async readAll() {
    try {
      let foundCommands = (await Command.find().toArray()).map(
        ({ _id, ...rest }) => ({ id: _id, ...rest })
      );
      return foundCommands;
    } catch (error) {
      throw error;
    }
  }

  static async read(commandId) {
    try {
      let foundCommand = await Command.findOne({ _id: ObjectId(commandId) });
      if (foundCommand) {
        let { _id, ...rest } = foundCommand;
        return { id: _id, ...rest };
      } else return null;
    } catch (error) {
      throw error;
    }
  }

  static async replace(commandId, commandData) {
    // filtering
    let { id, _id, _commandData } = commandData;

    try {
      let result = await Command.replaceOne(
        { _id: ObjectId(commandId) },
        _commandData
      );

      if (!result.acknowledged)
        throw new Error("replaceOne acknowledged error");
      if (!result.matchedCount)
        throw new Error("replaceOne matchedCount error");
    } catch (error) {
      throw error;
    }
  }

  static async update(commandId, commandData) {
    // filtering
    let { id, _id, ..._commandData } = commandData;

    try {
      let result = await Command.updateOne(
        { _id: ObjectId(commandId) },
        { $set: _commandData }
      );
      if (!result.acknowledged) throw new Error("updateOne acknowledged error");
      if (!result.matchedCount) throw new Error("updateOne matchedCount error");
    } catch (error) {
      throw error;
    }
  }

  static async delete(commandId) {
    try {
      let result = await Command.deleteOne({ _id: ObjectId(commandId) });
      if (!result.acknowledged) throw new Error("deleteOne acknowledged error");
      if (!result.deletedCount) throw new Error("deleteOne deletedCount error");
    } catch (error) {
      throw error;
    }
  }
}

module.exports = CommandDAO;
