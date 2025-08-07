"use strict";

class MongoDBRepository {
    constructor(Model) {
        // TODO: look into declaring non_update field as an extendable field here...
        // and simply deleting defined document attribs from update payload at this base level
        // that way, non-update is available off-d-block. and all an enngineer needs do is override the field and specify what nnot to update
        this.Model = Model;
    }

    create(payload) {
        return this.Model.create(payload);
    }

    findById(id) {
        return this.Model.findOne({_id: id});
    }

    findOne(condition, sort = {}, options = {}) {
        const query =  this.Model.findOne(condition).sort(sort);

        if(options.lean) return query.lean();

        return query;
    }

    all(condition, sort = {_id: -1}, page = null, limit = 100, options = {}) {
        try{
            if(page){
                delete condition.page;
                delete condition.limit;
                if(options.lean){
                    return this.Model.paginate(condition,{sort,
                        page,
                        limit: parseInt(limit)}).lean();
                }

                return this.Model.paginate(condition,{sort,
                    page,
                    limit: parseInt(limit)});
            }else {
                if(options.lean)
                    return this.Model.find(condition).sort(sort).lean();

                return this.Model.find(condition).sort(sort);
            }
        }catch (e) {
            console.log(e);

            return this.Model.find(condition).sort(sort);
        }
    }

    truncate(condition = {}) {
        if (process.env.NODE_ENV == "development") {
            return this.Model.deleteMany(condition);
        }

        return null;
    }

    deleteMany(condition = {}){
        return this.Model.deleteMany(condition);
    }

    massInsert(data = []) {
        if (data.length === 0)
            return [];

        return this.Model.insertMany(data);
    }

    count(condition = {}){
        return this.Model.countDocuments(condition);
    }
    update(query = {}, newData = {}) {
        return this.Model.updateMany(query, newData);
    }

    upsert(query = {}, newData = {}) {
        return this.Model.update(query, newData, {upsert: true,
            setDefaultsOnInsert: true});
    }

    findOneAndUpdate(filter, update){
        return this.Model.findOneAndUpdate(filter, update, {
            new: true
        });
    }

    getModel(){
        return this.Model;
    }
}


module.exports =  MongoDBRepository;
