'use client'

const leaders = [
    {
        name: "Maria Ramos",
        role: "Group Chair",
        image: "/images/Maria Ramos.png"
    },
    {
        name: "Bill Winters, CBE",
        role: "Group Chief Executive",
        image: "/images/Bill Winters, CBE.png"
    },
    {
        name: "Pete Burrill",
        role: "Interim Group Chief Financial Officer",
        image: "/images/Pete Burrill.png"
    },
    {
        name: "Shirish Apte",
        role: "Independent Non-Executive Director",
        image: "/images/Shirish Apte.png"
    },
    {
        name: "Jackie Hunt",
        role: "Independent Non-Executive Director",
        image: "/images/Jackie Hunt.png"
    },
    {
        name: "Diane Jurgens",
        role: "Independent Non-Executive Director",
        image: "/images/Diane Jurgens.png"
    }
]

export function Leadership() {
    return (
        <section className="py-24 bg-white">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="mb-16">
                    <h2 className="text-4xl md:text-5xl font-black text-gray-900 mb-6">
                        Our Leadership
                    </h2>
                    <p className="text-xl text-gray-500 max-w-3xl leading-relaxed font-medium">
                        Our leadership team brings together a diverse range of experiences and expertise to drive our purpose of driving commerce and prosperity through our unique diversity.
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {leaders.map((leader, index) => (
                        <div key={index} className="flex flex-col group transition-all duration-500 hover:-translate-y-2">
                            <div className="aspect-[4/3] bg-white flex items-end justify-center relative overflow-hidden rounded-t-[2.5rem]">
                                <img
                                    src={leader.image}
                                    alt={leader.name}
                                    className="h-full w-auto object-contain z-10 transition-transform duration-700 group-hover:scale-105"
                                />
                            </div>
                            <div className="bg-[#0066CC] px-8 py-10 text-white rounded-b-[3.5rem] shadow-[0_20px_50px_rgba(0,102,204,0.15)] flex flex-col justify-start min-h-[180px]">
                                <h3 className="text-3xl font-black mb-3 tracking-tight">
                                    {leader.name}
                                </h3>
                                <p className="text-[11px] font-bold text-blue-200/60 uppercase tracking-[0.15em] leading-relaxed max-w-[240px]">
                                    {leader.role}
                                </p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    )
}
